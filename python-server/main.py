import os
import sys
import json
import time
import hashlib
import re as _re
import numpy as np
import cv2
import shutil
import threading
import queue
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    import easyocr
    ocr_reader = easyocr.Reader(['en'], gpu=False)
except Exception:
    ocr_reader = None

try:
    from deepface import DeepFace
except Exception as e:
    # Not fatal: face matching happens in face_worker.py, a separate process.
    print(f"DeepFace not importable in-process ({type(e).__name__}); using isolated worker.")

def run_face_match(crop_path, watchlist_dir, timeout=60):
    """Match a face crop against the watchlist in a subprocess.

    Returns the parsed result dict, or None if the worker could not be run.
    """
    import subprocess
    try:
        proc = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "face_worker.py"), crop_path, watchlist_dir],
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return {"error": "timeout"}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}

    # The worker prints one JSON line; models can log to stdout before it.
    for line in reversed(proc.stdout.strip().splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    return {"error": (proc.stderr.strip() or "no output")[:200]}

from twilio.rest import Client
import dotenv
dotenv.load_dotenv(Path(__file__).parent.parent / '.env.local')

import agent
agent.start_agent()

analysis_queue = queue.Queue(maxsize=10)
last_anpr = {}
last_intrusion = {}
last_face = {}
FACE_THROTTLE = 15  # Seconds between face-match attempts per camera

# Immutable SHA-256 hash-chained ledger of all tactical alerts (blockchain audit trail).
# Each block embeds the previous block's hash, so any tampering breaks the chain.
alert_chain = []
_alert_seq = 0

# Plate hotlist, re-read from disk on change so the Watchlist page can edit it live.
_hotlist_cache = {"mtime": None, "index": {}}

def find_hotlisted_plate(plate):
    """Return the watchlist entry for a plate, or None. Plates are stored
    unspaced and uppercased; OCR normalises to that form."""
    path = Path(__file__).parent / "watchlist_plates.json"
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return None
    if mtime != _hotlist_cache["mtime"]:
        index = {}
        try:
            with open(path) as f:
                for entry in json.load(f).get("plates", []):
                    key = _re.sub(r"[\s\-.]", "", str(entry.get("plate", "")).upper())
                    if key:
                        index[key] = entry
        except Exception:
            index = {}
        _hotlist_cache.update(mtime=mtime, index=index)
    return _hotlist_cache["index"].get(plate)

def clean_indian_plate(raw_text):
    """Post-process OCR string to rectify common character substitution confusions in Indian plates."""
    text = _re.sub(r'[\s\-.]', '', raw_text.upper())
    if len(text) < 8 or len(text) > 11:
        return text
    s = list(text)
    digit_to_char = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '4': 'A'}
    char_to_digit = {'O': '0', 'D': '0', 'Q': '0', 'I': '1', 'L': '1', '|': '1', 'Z': '2', 'S': '5', 'B': '8'}
    
    # State code (first 2 chars): always letters
    for i in range(min(2, len(s))):
        if s[i] in digit_to_char:
            s[i] = digit_to_char[s[i]]
            
    # District code (chars 2-4): digits (unless BH series)
    if len(s) >= 4 and not (s[0].isdigit() and s[1].isdigit()):
        for i in range(2, 4):
            if s[i] in char_to_digit:
                s[i] = char_to_digit[s[i]]
                
    # Series code (chars 4 to len-4): letters
    if len(s) >= 8:
        for i in range(4, len(s) - 4):
            if s[i] in digit_to_char:
                s[i] = digit_to_char[s[i]]
                
    # Unique number (last 4 chars): digits
    if len(s) >= 8:
        for i in range(len(s) - 4, len(s)):
            if s[i] in char_to_digit:
                s[i] = char_to_digit[s[i]]
                
    return ''.join(s)

INDIAN_PLATE_RE = _re.compile(
    r'^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$'
)

def record_alert(alert_type, zone, msg="", camera_id="", people_count=0, max_capacity=0, whatsapp_sent=False, face_confidence=None):
    """Append an alert to the immutable hash chain and feed the AI Watch Commander agent."""
    global _alert_seq
    _alert_seq += 1
    timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    previous_hash = alert_chain[-1]["hash"] if alert_chain else "0" * 64
    data_string = f"{alert_type}{zone}{camera_id}{people_count}{max_capacity}{timestamp_iso}{previous_hash}"
    new_hash = hashlib.sha256(data_string.encode()).hexdigest()
    record = {
        "id": f"ALT-{int(time.time() * 1000)}-{_alert_seq}",
        "type": alert_type,
        "zone": zone,
        "msg": msg,
        "camera_id": camera_id,
        "people_count": people_count,
        "max_capacity": max_capacity,
        "timestamp": timestamp_iso,
        "acknowledged": False,
        "whatsapp_sent": whatsapp_sent,
        "face_confidence": face_confidence,
        "hash": new_hash,
        "previous_hash": previous_hash,
    }
    alert_chain.append(record)
    agent.global_alerts_store.append(record)
    return record

def heavy_analysis_worker():
    while True:
        try:
            task = analysis_queue.get()
            if task["type"] == "plate" and ocr_reader:
                text_results = ocr_reader.readtext(task["crop"], detail=0)
                if text_results:
                    plate = clean_indian_plate(" ".join(text_results))
                    if time.time() - last_anpr.get(plate, 0) > 5:
                        print(f"ANPR: Detected Plate '{plate}'")
                        last_anpr[plate] = time.time()
            elif task["type"] == "face":
                try:
                    import uuid
                    temp_path = str(Path(__file__).parent / f"temp_face_{uuid.uuid4().hex}.jpg")
                    cv2.imwrite(temp_path, task["crop"])

                    watchlist_dir = str(Path(__file__).parent / "watchlist_faces")
                    if os.path.isdir(watchlist_dir) and os.listdir(watchlist_dir):
                        match = run_face_match(temp_path, watchlist_dir)
                        if match and match.get("match"):
                            cid = task.get("camera_id", "cam-1")
                            czone = task.get("zone", "Face Watchlist")
                            print(f"MATCHED SUSPECT: {match['match']} (cosine {match['distance']}) in {czone}")
                            record_alert(
                                "FACE_WATCHLIST_MATCH",
                                zone=czone,
                                msg=f"WANTED SUSPECT DETECTED: {match['match']} (Match confidence: {int(match['distance']*100)}%)",
                                camera_id=cid,
                                people_count=1,
                                face_confidence=match["distance"],
                            )
                        elif match and match.get("error") not in (None, "empty_watchlist", "no_face_detected"):
                            print(f"Face match status: {match['error']}")

                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                except Exception as e:
                    print(f"Face task error: {e}")
            analysis_queue.task_done()
        except Exception as e:
            print(f"Analysis worker error: {e}")

threading.Thread(target=heavy_analysis_worker, daemon=True).start()

app = FastAPI(title="TRINETRA Detection Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
WATCHLIST_FACES_DIR = Path(__file__).parent / "watchlist_faces"
WATCHLIST_FACES_DIR.mkdir(exist_ok=True)

# Mount static files so the frontend can display enrolled suspect photos
app.mount("/watchlist_faces", StaticFiles(directory=str(WATCHLIST_FACES_DIR)), name="watchlist_faces")

yolo_model = None
latest_coordinates = {
    "timestamp": time.time() * 1000,
    "people": [],
    "density": 0,
    "count": 0
}

latest_frame_boxes = None
latest_frame_privacy = None
camera_latest_frames = {}
camera_latest_coords = {}
camera_latest_ocr = {}
latest_raw_frames_map = {}

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            print("Loading YOLOv8 model...")
            yolo_model = YOLO(str(Path(__file__).parent / "yolov8n.pt"))
            print("YOLOv8 model loaded successfully!")
        except Exception as e:
            print(f"YOLO not available: {e}")
            yolo_model = None
    return yolo_model

def load_cameras():
    config_path = Path(__file__).parent / "cameras.json"
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception:
        return {"cameras": []}

VIDEO_EXTENSIONS = (".mp4", ".avi", ".mov", ".mkv", ".webm")

def is_video_file(url):
    return str(url).lower().endswith(VIDEO_EXTENSIONS)

def continuous_ocr_worker():
    """Background OCR loop scanning active video feeds for Indian license plates."""
    while True:
        try:
            if ocr_reader is not None:
                for cid, raw_frame in list(latest_raw_frames_map.items()):
                    if raw_frame is None:
                        continue
                    raw_h, raw_w = raw_frame.shape[:2]
                    small_frame = cv2.resize(raw_frame, (640, 480))
                    scale_x = raw_w / 640.0
                    scale_y = raw_h / 480.0

                    new_boxes = []
                    seen_texts = set()
                    results = ocr_reader.readtext(small_frame)
                    for (bbox, raw_text, prob) in results:
                        text = clean_indian_plate(raw_text)
                        if text in seen_texts:
                            continue
                        if prob >= 0.50 and INDIAN_PLATE_RE.match(text):
                            (tl, tr, br, bl) = bbox
                            x1 = int(tl[0] * scale_x)
                            y1 = int(tl[1] * scale_y)
                            x2 = int(br[0] * scale_x)
                            y2 = int(br[1] * scale_y)
                            new_boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "text": text})
                            seen_texts.add(text)
                    camera_latest_ocr[cid] = new_boxes
        except Exception as e:
            pass
        time.sleep(1.0)

threading.Thread(target=continuous_ocr_worker, daemon=True).start()

def background_processing_loop():
    """Multi-camera processing loop running real-time YOLO, face detection, CLAHE, and virtual fence."""
    global latest_coordinates, latest_frame_boxes, latest_frame_privacy
    global camera_latest_frames, camera_latest_coords

    model = get_yolo_model()
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    ph = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(ph, "Connecting to camera feed...", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 100), 2)
    _, ph_buf = cv2.imencode('.jpg', ph)
    ph_bytes = ph_buf.tobytes()

    camera_captures = {}

    def get_capture(cam_info):
        cid = cam_info["id"]
        raw_url = cam_info["url"]

        if is_video_file(raw_url):
            p = Path(raw_url)
            target_url = str(p if p.is_absolute() else Path(__file__).parent / p)
            if not Path(target_url).exists():
                return None
        else:
            target_url = raw_url
            if str(target_url).startswith("http://") and target_url.count(":") == 1:
                target_url = target_url.rstrip("/") + ":4747/video"
            elif ":4747" in target_url and not target_url.endswith("/video"):
                target_url = target_url.rstrip("/") + "/video"

        cap = camera_captures.get(cid)
        if cap is None or not cap.isOpened():
            cap = cv2.VideoCapture(int(target_url) if str(target_url).isdigit() else target_url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            camera_captures[cid] = cap
        return cap

    while True:
        try:
            cameras = load_cameras().get("cameras", [])
            active_cams = [c for c in cameras if c.get("enabled") and c.get("url")]

            if not active_cams:
                time.sleep(0.5)
                continue

            for cam in active_cams:
                cid = cam["id"]
                czone = cam.get("zone", "Sector A")
                cap = get_capture(cam)
                if cap is None or not cap.isOpened():
                    camera_latest_frames[cid] = {"boxes": ph_bytes, "privacy": ph_bytes}
                    continue

                success, frame = cap.read()
                if not success:
                    if is_video_file(cam["url"]):
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        success, frame = cap.read()
                    if not success:
                        continue

                latest_raw_frames_map[cid] = frame
                height, width = frame.shape[:2]
                people = []
                boxes = []

                # 1. Night Vision (Real CLAHE on L-channel of LAB color space)
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                brightness = float(np.mean(gray))
                if brightness < 60:
                    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
                    l_channel, a_channel, b_channel = cv2.split(lab)
                    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                    cl = clahe.apply(l_channel)
                    enhanced_lab = cv2.merge((cl, a_channel, b_channel))
                    frame = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
                    cv2.putText(frame, "NIGHT VISION ENHANCEMENT (CLAHE)", (width // 2 - 160, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 100), 2)

                # 2. Virtual Fence Line (top 75% of frame)
                fence_y = int(height * 0.75)
                cv2.line(frame, (0, fence_y), (width, fence_y), (0, 0, 255), 2)
                cv2.putText(frame, "VIRTUAL FENCE ZONE", (10, fence_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

                # 3. YOLO Object Detection (persons and vehicles)
                if model is not None:
                    try:
                        results = model(frame, classes=[0, 2, 3, 5, 7], conf=0.35, verbose=False)
                        for result in results:
                            for box in result.boxes:
                                x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                                conf = float(box.conf[0])
                                cls = int(box.cls[0])
                                cx = ((x1 + x2) / 2) / width * 100
                                cy = ((y1 + y2) / 2) / height * 100
                                if cls == 0:
                                    people.append({"id": len(people) + 1, "x": round(cx, 1), "y": round(cy, 1)})
                                    boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf, "type": "person"})
                                else:
                                    boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf, "type": "vehicle"})
                    except Exception:
                        pass

                count = len(people)
                density = min(round(count / max(1, (width * height) / 100000) * 10, 1), 100)
                coords = {
                    "timestamp": time.time() * 1000,
                    "people": people,
                    "density": density,
                    "count": count
                }
                camera_latest_coords[cid] = coords

                frame_privacy = frame.copy()
                intrusion_detected = False

                for box in boxes:
                    is_person = box["type"] == "person"
                    color = (16, 185, 129) if is_person else (255, 165, 0)
                    label = "Human" if is_person else "Vehicle"

                    # 4. Virtual Fence Intrusion Check
                    if is_person and box["y2"] > fence_y:
                        color = (0, 0, 255)
                        label = "INTRUSION"
                        intrusion_detected = True

                    cv2.rectangle(frame, (box["x1"], box["y1"]), (box["x2"], box["y2"]), color, 2)
                    cv2.putText(frame, f"{label} {box['conf']:.2f}", (box["x1"], box["y1"] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                    # 5. Real Face Detection & Privacy Blurring
                    if is_person and (box["y2"] - box["y1"]) > 50:
                        px1, py1, px2, py2 = box["x1"], box["y1"], box["x2"], box["y2"]
                        hy2 = py1 + int((py2 - py1) * 0.55)
                        head_crop = frame[py1:hy2, px1:px2]
                        detected_faces = []
                        if head_crop.size > 0 and head_crop.shape[0] >= 15 and head_crop.shape[1] >= 15:
                            head_gray = cv2.cvtColor(head_crop, cv2.COLOR_BGR2GRAY)
                            faces = face_cascade.detectMultiScale(head_gray, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20))
                            for (fx_rel, fy_rel, fw, fh) in faces:
                                detected_faces.append((px1 + fx_rel, py1 + fy_rel, fw, fh))
                        if not detected_faces and (py2 - py1) > 65:
                            gw, gh = int((px2 - px1) * 0.45), int((py2 - py1) * 0.22)
                            gx, gy = px1 + int((px2 - px1) * 0.27), py1 + int(gh * 0.15)
                            detected_faces.append((gx, gy, gw, gh))

                        for (fx, fy, fw, fh) in detected_faces:
                            fx, fy = max(0, fx), max(0, fy)
                            fw, fh = min(width - fx, fw), min(height - fy, fh)
                            if fw > 5 and fh > 5:
                                cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (255, 0, 0), 1)
                                cv2.putText(frame, "Face", (fx, fy - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 0, 0), 1)
                                face_roi = frame_privacy[fy:fy+fh, fx:fx+fw]
                                if face_roi.size > 0:
                                    blurred = cv2.GaussianBlur(face_roi, (99, 99), 30)
                                    frame_privacy[fy:fy+fh, fx:fx+fw] = blurred
                                    if not analysis_queue.full() and time.time() - last_face.get(cid, 0) > FACE_THROTTLE:
                                        last_face[cid] = time.time()
                                        analysis_queue.put({
                                            "type": "face",
                                            "crop": frame[fy:fy+fh, fx:fx+fw],
                                            "camera_id": cid,
                                            "zone": czone,
                                        })

                # Intrusion alert recording with cooldown (10 seconds per camera)
                if intrusion_detected:
                    now = time.time()
                    if now - last_intrusion.get(cid, 0) > 10:
                        last_intrusion[cid] = now
                        print(f"PERIMETER BREACH on {cid} in {czone}")
                        record_alert(
                            "intrusion",
                            zone=czone,
                            msg=f"Perimeter breach: subject crossed virtual fence in {czone}",
                            camera_id=cid,
                            people_count=1,
                            max_capacity=0,
                        )

                # 6. ANPR Plate Overlay & Hotlist Matching
                for obox in camera_latest_ocr.get(cid, []):
                    ox1, oy1, ox2, oy2, text = obox["x1"], obox["y1"], obox["x2"], obox["y2"], obox["text"]
                    ox1, oy1 = max(0, ox1), max(0, oy1)
                    ox2, oy2 = min(width, ox2), min(height, oy2)
                    hotlisted = find_hotlisted_plate(text)
                    color = (0, 0, 255) if hotlisted else (0, 255, 255)
                    cv2.rectangle(frame, (ox1, oy1), (ox2, oy2), color, 2)
                    label = f"HOTLIST: {text}" if hotlisted else f"ANPR: {text}"
                    cv2.putText(frame, label, (ox1, oy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                    if hotlisted:
                        if time.time() - last_anpr.get(text, 0) > 30:
                            last_anpr[text] = time.time()
                            print(f"ANPR HOTLIST HIT: '{text}' - {hotlisted.get('reason')}")
                            record_alert(
                                "ANPR_HOTLIST_HIT",
                                zone=czone,
                                msg=f"WANTED VEHICLE: {text} ({hotlisted.get('reason', 'Stolen vehicle')})",
                                camera_id=cid,
                                people_count=1,
                                max_capacity=0,
                            )
                    else:
                        if time.time() - last_anpr.get(text, 0) > 60:
                            last_anpr[text] = time.time()
                            print(f"ANPR LIVE: Detected plate '{text}'")

                # Tactical banner overlay
                overlay = frame.copy()
                cv2.rectangle(overlay, (0, 0), (width, 45), (0, 0, 0), -1)
                frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
                cv2.putText(frame, f"TRINETRA // {czone} ({cid})", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (16, 185, 129), 2)
                cv2.circle(frame, (width - 150, 25), 6, (0, 0, 255), -1)
                cv2.putText(frame, "AI ACTIVE", (width - 135, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 100), 1)

                _, buf_boxes = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                _, buf_priv = cv2.imencode('.jpg', frame_privacy, [cv2.IMWRITE_JPEG_QUALITY, 80])
                camera_latest_frames[cid] = {"boxes": buf_boxes.tobytes(), "privacy": buf_priv.tobytes()}

                # Keep globals updated with active/first camera
                latest_frame_boxes = buf_boxes.tobytes()
                latest_frame_privacy = buf_priv.tobytes()
                latest_coordinates = coords

            time.sleep(0.02)
        except Exception as e:
            print(f"Loop error: {e}")
            time.sleep(0.5)

threading.Thread(target=background_processing_loop, daemon=True).start()

def stream_generator(feed_type="boxes", camera_id=None):
    while True:
        frame_data = None
        if camera_id and camera_id in camera_latest_frames:
            frame_data = camera_latest_frames[camera_id].get(feed_type)
        elif camera_latest_frames:
            first_cam = next(iter(camera_latest_frames.values()))
            frame_data = first_cam.get(feed_type)

        if frame_data is not None:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
        time.sleep(0.04)

class AlertConfig(BaseModel):
    camera_id: str
    zone: str
    people_count: int
    max_capacity: int

@app.post("/api/alert/check-capacity")
async def trigger_twilio_alert(alert: AlertConfig):
    try:
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER')
        to_number = os.getenv('TWILIO_TO_NUMBER')

        whatsapp_sent = False
        if account_sid and auth_token and whatsapp_number and to_number:
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                from_=f"whatsapp:{whatsapp_number}",
                body=f"RESTRICTED ZONE BREACH\nZone: {alert.zone}\nCamera: {alert.camera_id}\nIntruders: {alert.people_count}\nAction Required!",
                to=f"whatsapp:{to_number}"
            )
            whatsapp_sent = True
            print(f"Twilio WhatsApp sent: {message.sid}")
        else:
            print("Twilio credentials missing in .env.local, alert skipped.")

        record_alert(
            "no_entry_violation" if alert.max_capacity == 0 else "overcrowding",
            zone=alert.zone,
            msg=f"Restricted zone breach: {alert.people_count} target(s) in {alert.zone}",
            camera_id=alert.camera_id,
            people_count=alert.people_count,
            max_capacity=alert.max_capacity,
            whatsapp_sent=whatsapp_sent,
        )
        return {"status": "success"}
    except Exception as e:
        print(f"Twilio error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/video_feed")
def video_feed(camera_id: str = None):
    return StreamingResponse(stream_generator("boxes", camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stream-with-boxes")
def stream_with_boxes(camera_id: str = None):
    return StreamingResponse(stream_generator("boxes", camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stream-with-privacy")
def stream_with_privacy(camera_id: str = None):
    return StreamingResponse(stream_generator("privacy", camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/coordinates")
def get_coordinates(camera_id: str = None):
    if camera_id and camera_id in camera_latest_coords:
        return JSONResponse(content=camera_latest_coords[camera_id])
    if camera_latest_coords:
        first_coords = next(iter(camera_latest_coords.values()))
        return JSONResponse(content=first_coords)
    return JSONResponse(content=latest_coordinates)

@app.get("/cameras")
def get_cameras():
    return JSONResponse(content=load_cameras())

class CameraConfig(BaseModel):
    id: str
    name: str
    url: str
    zone: str
    enabled: bool
    area: float
    areaUnit: str
    densityLevel: str
    capacity: int

@app.post("/cameras")
def add_camera(camera: CameraConfig):
    config_path = Path(__file__).parent / "cameras.json"
    cameras_data = load_cameras()
    if "cameras" not in cameras_data: cameras_data["cameras"] = []
    cameras_data["cameras"] = [c for c in cameras_data["cameras"] if c.get("id") != camera.id]
    cameras_data["cameras"].append(camera.dict())
    with open(config_path, "w") as f: json.dump(cameras_data, f, indent=4)
    return {"status": "success"}

@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: str):
    config_path = Path(__file__).parent / "cameras.json"
    cameras_data = load_cameras()
    if "cameras" not in cameras_data: return {"status": "not_found"}
    original_len = len(cameras_data["cameras"])
    cameras_data["cameras"] = [c for c in cameras_data["cameras"] if c.get("id") != camera_id]
    if len(cameras_data["cameras"]) < original_len:
        with open(config_path, "w") as f: json.dump(cameras_data, f, indent=4)
        return {"status": "deleted"}
    return {"status": "not_found"}

@app.put("/cameras/{camera_id}")
async def update_camera(camera_id: str, updates: dict):
    config_path = Path(__file__).parent / "cameras.json"
    cameras_data = load_cameras()
    if "cameras" not in cameras_data: return {"status": "not_found"}

    found = False
    for i, c in enumerate(cameras_data["cameras"]):
        if c.get("id") == camera_id:
            cameras_data["cameras"][i].update(updates)
            found = True
            break

    if found:
        with open(config_path, "w") as f:
            json.dump(cameras_data, f, indent=4)
        return {"status": "success"}
    return {"status": "not_found"}

@app.post("/cameras/upload")
async def upload_video(camera_id: str = Form(...), file: UploadFile = File(...)):
    file_extension = file.filename.split(".")[-1]
    safe_filename = f"{camera_id}.{file_extension}"
    file_path = str(UPLOAD_DIR / safe_filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "url": file_path}

def load_json_file(filename, default_key):
    path = Path(__file__).parent / filename
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return {default_key: []}

def save_json_file(filename, data):
    path = Path(__file__).parent / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=4)

@app.get("/watchlist/faces")
def get_watchlist_faces():
    return load_json_file("watchlist_faces.json", "faces")

@app.post("/watchlist/faces")
async def add_watchlist_face(name: str = Form(...), threat_level: str = Form(...), file: UploadFile = File(...)):
    faces_data = load_json_file("watchlist_faces.json", "faces")
    face_id = str(int(time.time()))
    safe_filename = f"{face_id}_{file.filename}"
    file_path = str(WATCHLIST_FACES_DIR / safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    faces_data["faces"].append({
        "id": face_id,
        "name": name,
        "threat_level": threat_level,
        "image": f"watchlist_faces/{safe_filename}",
        "added_at": time.strftime("%Y-%m-%d %H:%M:%S")
    })
    save_json_file("watchlist_faces.json", faces_data)
    return {"status": "success"}

@app.delete("/watchlist/faces/{face_id}")
def delete_watchlist_face(face_id: str):
    faces_data = load_json_file("watchlist_faces.json", "faces")
    faces_data["faces"] = [f for f in faces_data["faces"] if f["id"] != face_id]
    save_json_file("watchlist_faces.json", faces_data)
    return {"status": "success"}

class PlateConfig(BaseModel):
    plate: str
    reason: str

@app.get("/watchlist/plates")
def get_watchlist_plates():
    return load_json_file("watchlist_plates.json", "plates")

@app.post("/watchlist/plates")
def add_watchlist_plate(plate: PlateConfig):
    plates_data = load_json_file("watchlist_plates.json", "plates")
    plates_data["plates"].append({
        "plate": _re.sub(r"[\s\-.]", "", plate.plate.upper()),
        "reason": plate.reason,
        "added_at": time.strftime("%Y-%m-%d %H:%M:%S")
    })
    save_json_file("watchlist_plates.json", plates_data)
    return {"status": "success"}

@app.delete("/watchlist/plates/{plate_id}")
def delete_watchlist_plate(plate_id: str):
    plates_data = load_json_file("watchlist_plates.json", "plates")
    wanted = _re.sub(r"[\s\-.]", "", plate_id.upper())
    plates_data["plates"] = [
        p for p in plates_data["plates"]
        if _re.sub(r"[\s\-.]", "", str(p["plate"]).upper()) != wanted
    ]
    save_json_file("watchlist_plates.json", plates_data)
    return {"status": "success"}

@app.get("/analytics/global")
def get_global_analytics():
    cameras_data = load_cameras()
    active_cameras = len([c for c in cameras_data.get("cameras", []) if c.get("enabled")])
    total_count = sum(coords.get("count", 0) for coords in camera_latest_coords.values())
    avg_density = round(float(np.mean([coords.get("density", 0) for coords in camera_latest_coords.values()])), 1) if camera_latest_coords else 0

    current_hour = int(time.strftime("%H"))
    if not hasattr(get_global_analytics, '_hourly'):
        get_global_analytics._hourly = [0] * 24
        get_global_analytics._peak = 0
        get_global_analytics._peak_hour = "00:00"
        get_global_analytics._total = 0

    get_global_analytics._hourly[current_hour] = max(get_global_analytics._hourly[current_hour], total_count)
    if total_count > get_global_analytics._peak:
        get_global_analytics._peak = total_count
        get_global_analytics._peak_hour = time.strftime("%H:00")
    get_global_analytics._total = max(get_global_analytics._total, total_count)

    return JSONResponse(content={
        "total_visitors": get_global_analytics._total,
        "current_count": total_count,
        "peak_hour": get_global_analytics._peak_hour,
        "peak_count": get_global_analytics._peak,
        "hourly_history": get_global_analytics._hourly,
        "active_cameras": active_cameras,
        "density": avg_density,
        "recent_alerts": list(reversed(alert_chain[-10:]))
    })

@app.get("/analytics/all")
def get_all_analytics():
    """Per-camera occupancy, used by the heatmap and zone analysis views."""
    cameras = load_cameras().get("cameras", [])
    active = [c for c in cameras if c.get("enabled")]

    camera_list = []
    total_people = 0
    total_area = max(1.0, sum(float(c.get("area") or 100) for c in active) or 100.0)

    for c in cameras:
        cid = c.get("id", "")
        coords = camera_latest_coords.get(cid, {})
        people_count = coords.get("count", 0)
        total_people += people_count
        cap = c.get("capacity", 50)
        density = min(round((people_count / cap * 100) if cap else 0, 1), 100)
        camera_list.append({
            "camera_id": cid,
            "name": c.get("name", ""),
            "zone": c.get("zone", ""),
            "enabled": bool(c.get("enabled")),
            "people_count": people_count,
            "capacity": cap,
            "density": density,
            "area": c.get("area", 0),
            "areaUnit": c.get("areaUnit", "sqm"),
        })

    return JSONResponse(content={
        "cameras": camera_list,
        "total_people": total_people,
        "total_people_count": total_people,
        "total_area": round(total_area, 1),
    })

class EmergencyAlert(BaseModel):
    zone: str = "Unknown Zone"
    reason: str = "Manual emergency trigger"
    camera_id: str = ""

@app.post("/api/alert/emergency")
async def trigger_emergency_alert(alert: EmergencyAlert):
    """Manual SOS. Records to the audit chain and sends WhatsApp when configured."""
    sent = False
    try:
        sid = os.getenv("TWILIO_ACCOUNT_SID")
        token = os.getenv("TWILIO_AUTH_TOKEN")
        frm = os.getenv("TWILIO_WHATSAPP_NUMBER")
        to = os.getenv("TWILIO_TO_NUMBER")
        if sid and token and frm and to:
            client = Client(sid, token)
            msg = client.messages.create(
                from_=f"whatsapp:{frm}",
                body=f"EMERGENCY SOS\nZone: {alert.zone}\nReason: {alert.reason}\nImmediate response required!",
                to=f"whatsapp:{to}",
            )
            sent = True
            print(f"Emergency WhatsApp sent: {msg.sid}")
        else:
            print("Twilio credentials missing; emergency alert logged only.")
    except Exception as e:
        print(f"Emergency Twilio error: {e}")

    record = record_alert(
        "EMERGENCY", zone=alert.zone,
        msg=f"MANUAL SOS: {alert.reason}",
        camera_id=alert.camera_id or "COMMAND-CENTER",
        whatsapp_sent=sent,
    )
    return {"status": "success", "alert_id": record["id"], "whatsapp_sent": sent}

@app.get("/settings")
def get_settings():
    path = Path(__file__).parent / "settings.json"
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return {
            "lowBandwidthMode": False,
            "privacyMaskingEnabled": False,
            "autoRefreshInterval": 2000,
            "showDensityOverlay": True,
            "alertSoundEnabled": True
        }

@app.put("/settings")
async def update_settings(settings: dict):
    path = Path(__file__).parent / "settings.json"
    with open(path, "w") as f:
        json.dump(settings, f, indent=4)
    return {"status": "success"}

@app.get("/api/alert/history")
def get_alert_history(limit: int = 50):
    return {"alerts": alert_chain[-limit:]}

@app.get("/api/reports")
def get_reports():
    return {"reports": agent.global_incident_reports}

@app.post("/api/alert/mock")
def mock_alert():
    record_alert("loitering", zone="Sector A", camera_id="CAM-01",
                 msg="Loitering detected in Sector A", people_count=1, max_capacity=0)
    record_alert("intrusion", zone="Sector A Perimeter", camera_id="CAM-02",
                 msg="Perimeter intrusion in Sector A", people_count=2, max_capacity=0)
    return {"status": "Mock alerts added to trigger agent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
