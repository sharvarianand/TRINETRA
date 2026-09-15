import os
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import threading
import time
import base64
from ultralytics import YOLO
from pydantic import BaseModel
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from typing import Dict, Optional
import json
import uuid
from shapely.geometry import Point, Polygon

try:
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False)
except ImportError:
    reader = None

load_dotenv()

# Load YOLO model
model = YOLO("yolov8n.pt")

# Load face detection cascade
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# Camera configuration file path
CAMERAS_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "cameras.json")
VIDEO_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024


# Camera data model
class Camera(BaseModel):
    id: str
    name: str
    url: str
    zone: str = "Main Plaza"
    enabled: bool = True
    area: Optional[float] = None
    areaUnit: Optional[str] = "sqm"
    densityLevel: Optional[str] = "medium"
    capacity: Optional[int] = None
    useManualCapacity: bool = False


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    zone: Optional[str] = None
    enabled: Optional[bool] = None
    area: Optional[float] = None
    areaUnit: Optional[str] = None
    densityLevel: Optional[str] = None
    capacity: Optional[int] = None
    useManualCapacity: Optional[bool] = None


# Multi-camera state
cameras: Dict[str, Camera] = {}
camera_frames: Dict[str, np.ndarray] = {}
camera_locks: Dict[str, threading.Lock] = {}
camera_threads: Dict[str, threading.Thread] = {}
camera_reconnect_events: Dict[str, threading.Event] = {}
camera_stop_events: Dict[str, threading.Event] = {}
camera_detections: Dict[str, list] = {}
camera_last_detection_time: Dict[str, float] = {}
camera_vehicles: Dict[str, list] = {}  # Track vehicles per camera

# ===== OBJECT TRACKING STATE =====
# Simple centroid-based tracker: {camera_id: {track_id: {"cx", "cy", "first_seen", "last_seen", "type"}}}
camera_tracks: Dict[str, Dict[int, dict]] = {}
next_track_id = 1
track_id_lock = threading.Lock()
LOITER_THRESHOLD_SECONDS = 15  # Trigger alert after 15 seconds in same area
TRACK_MAX_DISTANCE = 80  # Max pixel distance to match same object

# ===== ANPR HOTLIST =====
HOTLIST_FILE = os.path.join(os.path.dirname(__file__), "anpr_hotlist.json")
anpr_hotlist: list = []  # [{"plate": "XX00XX0000", "reason": "stolen"}, ...]

def load_hotlist():
    global anpr_hotlist
    if os.path.exists(HOTLIST_FILE):
        try:
            with open(HOTLIST_FILE, "r") as f:
                anpr_hotlist = json.load(f)
        except: pass

def save_hotlist():
    try:
        with open(HOTLIST_FILE, "w") as f:
            json.dump(anpr_hotlist, f, indent=2)
    except: pass

def check_plate_hotlist(plate_text: str) -> Optional[dict]:
    """Check if a detected plate matches any hotlist entry"""
    if not plate_text or len(plate_text) < 3:
        return None
    clean = plate_text.upper().replace(" ", "").replace("-", "")
    for entry in anpr_hotlist:
        hotlist_clean = entry["plate"].upper().replace(" ", "").replace("-", "")
        if clean in hotlist_clean or hotlist_clean in clean:
            return entry
    return None

# ===== FACE WATCHLIST =====
WATCHLIST_DIR = os.path.join(os.path.dirname(__file__), "watchlist_faces")
WATCHLIST_META_FILE = os.path.join(os.path.dirname(__file__), "watchlist_meta.json")
os.makedirs(WATCHLIST_DIR, exist_ok=True)
face_watchlist: list = []  # [{"id": "...", "name": "...", "threat_level": "HIGH", "file": "...", "histogram": [...]}]

def load_face_watchlist():
    global face_watchlist
    if os.path.exists(WATCHLIST_META_FILE):
        try:
            with open(WATCHLIST_META_FILE, "r") as f:
                face_watchlist = json.load(f)
            # Recompute histograms for matching
            for entry in face_watchlist:
                img_path = os.path.join(WATCHLIST_DIR, entry.get("file", ""))
                if os.path.exists(img_path):
                    img = cv2.imread(img_path)
                    if img is not None:
                        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                        entry["_hist"] = cv2.calcHist([gray], [0], None, [256], [0, 256])
                        cv2.normalize(entry["_hist"], entry["_hist"])
            print(f"Loaded {len(face_watchlist)} watchlist faces")
        except Exception as e:
            print(f"Error loading watchlist: {e}")

def save_face_watchlist():
    try:
        # Save without internal histogram data
        save_data = [{k: v for k, v in entry.items() if not k.startswith("_")} for entry in face_watchlist]
        with open(WATCHLIST_META_FILE, "w") as f:
            json.dump(save_data, f, indent=2)
    except: pass

def match_face_against_watchlist(face_img) -> Optional[dict]:
    """Compare a detected face crop against all watchlist faces using histogram correlation"""
    if not face_watchlist or face_img is None or face_img.size == 0:
        return None
    try:
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        cv2.normalize(hist, hist)
        
        best_match = None
        best_score = 0.0
        for entry in face_watchlist:
            if "_hist" in entry:
                score = cv2.compareHist(hist, entry["_hist"], cv2.HISTCMP_CORREL)
                if score > best_score and score > 0.7:  # Threshold for match
                    best_score = score
                    best_match = entry
        return best_match
    except:
        return None

# Analytics state for "Whole App Sync"
global_analytics = {
    "total_visitors": 0,
    "current_count": 0,  # Live sum of all camera detections
    "peak_hour": "00:00",
    "peak_count": 0,
    "hourly_history": [0] * 24,
    "last_reset_day": time.strftime("%Y-%m-%d"),
    "active_cameras": 0,
    "loitering_alerts": [],  # Recent loitering events
    "hotlist_hits": [],  # Recent ANPR hotlist matches
    "watchlist_hits": [],  # Recent face watchlist matches
}
analytics_lock = threading.Lock()


def load_cameras_from_file():
    """Load camera configuration from JSON file"""
    global cameras
    if os.path.exists(CAMERAS_CONFIG_FILE):
        try:
            with open(CAMERAS_CONFIG_FILE, "r") as f:
                data = json.load(f)
                for cam_data in data.get("cameras", []):
                    cam = Camera(**cam_data)
                    cameras[cam.id] = cam
                print(f"Loaded {len(cameras)} cameras from config file")
        except Exception as e:
            print(f"Error loading cameras config: {e}")

    # If no cameras loaded, try to use legacy DROIDCAM_URL
    if not cameras:
        legacy_url = os.getenv("DROIDCAM_URL")
        if legacy_url:
            default_cam = Camera(
                id="cam-1",
                name="Main Camera",
                url=legacy_url + "/video",
                zone="Main Plaza",
                enabled=True,
            )
            cameras[default_cam.id] = default_cam
            save_cameras_to_file()
            print(f"Created default camera from DROIDCAM_URL: {legacy_url}")


def save_cameras_to_file():
    """Save camera configuration to JSON file"""
    try:
        data = {"cameras": [cam.model_dump() for cam in cameras.values()]}
        with open(CAMERAS_CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving cameras config: {e}")


def capture_loop(camera_id: str):
    """Background thread to continuously capture frames from a specific camera"""
    global camera_frames

    while not camera_stop_events.get(camera_id, threading.Event()).is_set():
        camera = cameras.get(camera_id)
        if not camera or not camera.enabled:
            time.sleep(1)
            continue

        print(f"[{camera_id}] Connecting to camera at {camera.url}...")
        cap = cv2.VideoCapture(camera.url)
        
        # Optimize camera capture settings for low latency and better focus
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer for lowest latency
        cap.set(cv2.CAP_PROP_FPS, 30)  # Request 30 FPS
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))  # Use MJPEG codec
        
        # Try to enable autofocus for better clarity
        try:
            cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)  # Enable autofocus
            cap.set(cv2.CAP_PROP_FOCUS, 0)  # Auto focus mode
            cap.set(cv2.CAP_PROP_SHARPNESS, 100)  # Increase sharpness for clarity
        except:
            pass  # Some cameras don't support these properties
        
        if not cap.isOpened():
            print(f"[{camera_id}] Failed to open camera, retrying in 3s...")
            time.sleep(3)
            continue

        print(f"[{camera_id}] Connected!")
        last_yolo_time = 0
        yolo_interval = 0.1  # Run YOLO every 100ms for real-time updates

        while cap.isOpened():
            if camera_stop_events.get(camera_id, threading.Event()).is_set():
                break

            if camera_reconnect_events.get(camera_id, threading.Event()).is_set():
                print(f"[{camera_id}] Reconnection requested...")
                camera_reconnect_events[camera_id].clear()
                break

            # Flush buffer by grabbing frames quickly without decoding
            # This ensures we always get the LATEST frame, not buffered ones
            # Flush more aggressively for better real-time sync
            for _ in range(5):  # Increased from 3 to 5 for better sync
                cap.grab()
            
            ret, frame = cap.read()
            
            if ret:
                # Store the raw frame
                with camera_locks.get(camera_id, threading.Lock()):
                    camera_frames[camera_id] = frame
                
                # Periodically run detection
                current_time = time.time()
                if current_time - last_yolo_time > yolo_interval:
                    detections = []
                    
                    # Night-Time Vision Enhancement
                    current_hour = int(time.strftime("%H"))
                    is_night = current_hour < 6 or current_hour >= 19
                    
                    detection_frame = frame.copy()
                    if is_night:
                        lab = cv2.cvtColor(detection_frame, cv2.COLOR_BGR2LAB)
                        l, a, b = cv2.split(lab)
                        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
                        cl = clahe.apply(l)
                        limg = cv2.merge((cl,a,b))
                        detection_frame = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
                    
                    # Virtual Fence Definition (Example polygon in the center)
                    h, w = frame.shape[:2]
                    virtual_fence = Polygon([(w*0.3, h*0.3), (w*0.7, h*0.3), (w*0.7, h*0.7), (w*0.3, h*0.7)])

                    # Method 1: Face/Head Detection (Primary for counting heads)
                    gray = cv2.cvtColor(detection_frame, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(
                        gray,
                        scaleFactor=1.1,
                        minNeighbors=5,
                        minSize=(30, 30),
                        flags=cv2.CASCADE_SCALE_IMAGE
                    )
                    
                    # Convert face detections to our format
                    face_detections = []
                    for (x, y, fw, fh) in faces:
                        cx, cy = x + fw/2, y + fh/2
                        is_intruding = virtual_fence.contains(Point(cx, cy))
                        face_detections.append({
                            "x1": int(x), "y1": int(y),
                            "x2": int(x + fw), "y2": int(y + fh),
                            "conf": 0.95,
                            "type": "face",
                            "intruding": is_intruding
                        })
                    
                    # Method 2: YOLO Person & Vehicle Detection
                    # Classes: 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck
                    target_classes = [0, 2, 3, 5, 7]
                    class_names = {0: "person", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
                    
                    results = model(detection_frame, conf=0.50, iou=0.45, classes=target_classes, imgsz=480, verbose=False)
                    
                    yolo_detections = []
                    for result in results:
                        for box in result.boxes:
                            cls_id = int(box.cls[0])
                            if cls_id in class_names:
                                x1, y1, x2, y2 = box.xyxy[0].tolist()
                                width = x2 - x1
                                height = y2 - y1
                                area = width * height
                                det_type = class_names[cls_id]
                                
                                cx, cy = x1 + width/2, y1 + height/2
                                is_intruding = virtual_fence.contains(Point(cx, cy))
                                
                                # ANPR logic for vehicles
                                plate_text = ""
                                if det_type != "person" and reader is not None and area > 5000:
                                    veh_img = frame[int(y1):int(y2), int(x1):int(x2)]
                                    if veh_img.size > 0:
                                        ocr_res = reader.readtext(veh_img)
                                        if ocr_res:
                                            plate_text = ocr_res[0][1]
                                
                                # Basic filtering for persons to avoid laptops/bags
                                if det_type == "person":
                                    if width > 40 and height > 80 and area > 3500 and height > width * 1.5:
                                        yolo_detections.append({
                                            "x1": int(x1), "y1": int(y1),
                                            "x2": int(x2), "y2": int(y2),
                                            "conf": float(box.conf[0]),
                                            "type": det_type,
                                            "plate": plate_text,
                                            "intruding": is_intruding
                                        })
                                else:
                                    yolo_detections.append({
                                        "x1": int(x1), "y1": int(y1),
                                        "x2": int(x2), "y2": int(y2),
                                        "conf": float(box.conf[0]),
                                        "type": det_type,
                                        "plate": plate_text,
                                        "intruding": is_intruding
                                    })
                    
                    # Combine detections with deduplication
                    # Priority: Use faces when detected, supplement with YOLO for people without visible faces
                    all_detections = face_detections.copy()
                    
                    # Add YOLO detections that don't overlap significantly with face detections
                    for yolo_det in yolo_detections:
                        # Check if this YOLO detection has a corresponding face detection
                        has_face = False
                        for face_det in face_detections:
                            # Check if face is within upper portion of YOLO person box
                            face_center_x = (face_det["x1"] + face_det["x2"]) / 2
                            face_center_y = (face_det["y1"] + face_det["y2"]) / 2
                            
                            # If face is inside person box, they're the same person
                            if (yolo_det["x1"] <= face_center_x <= yolo_det["x2"] and
                                yolo_det["y1"] <= face_center_y <= yolo_det["y2"]):
                                has_face = True
                                break
                        
                        # Only add YOLO detection if no face found (e.g., back of head, profile)
                        if not has_face:
                            all_detections.append(yolo_det)
                    
                    # Use the combined detections
                    detections = all_detections
                    
                    # ===== OBJECT TRACKING & LOITERING DETECTION =====
                    global next_track_id
                    if camera_id not in camera_tracks:
                        camera_tracks[camera_id] = {}
                    
                    tracks = camera_tracks[camera_id]
                    matched_track_ids = set()
                    
                    for det in detections:
                        cx = (det["x1"] + det["x2"]) / 2
                        cy = (det["y1"] + det["y2"]) / 2
                        
                        # Find closest existing track
                        best_tid = None
                        best_dist = TRACK_MAX_DISTANCE
                        for tid, track in tracks.items():
                            dist = ((cx - track["cx"])**2 + (cy - track["cy"])**2) ** 0.5
                            if dist < best_dist:
                                best_dist = dist
                                best_tid = tid
                        
                        if best_tid is not None and best_tid not in matched_track_ids:
                            # Update existing track
                            tracks[best_tid]["cx"] = cx
                            tracks[best_tid]["cy"] = cy
                            tracks[best_tid]["last_seen"] = current_time
                            det["track_id"] = best_tid
                            matched_track_ids.add(best_tid)
                            
                            # Check for loitering
                            dwell = current_time - tracks[best_tid]["first_seen"]
                            if dwell > LOITER_THRESHOLD_SECONDS and not tracks[best_tid].get("loiter_alerted"):
                                tracks[best_tid]["loiter_alerted"] = True
                                det["loitering"] = True
                                det["dwell_time"] = round(dwell, 1)
                                cam_zone = cameras.get(camera_id)
                                zone_name = cam_zone.zone if cam_zone else "Unknown"
                                with analytics_lock:
                                    global_analytics["loitering_alerts"].append({
                                        "track_id": best_tid,
                                        "zone": zone_name,
                                        "camera_id": camera_id,
                                        "dwell_seconds": round(dwell, 1),
                                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                    })
                                    # Keep only last 20
                                    global_analytics["loitering_alerts"] = global_analytics["loitering_alerts"][-20:]
                                if ALERTS_ENABLED:
                                    try:
                                        send_whatsapp_alert(
                                            alert_type="loitering",
                                            zone=zone_name,
                                            camera_id=camera_id,
                                            people_count=1,
                                            max_capacity=0
                                        )
                                    except: pass
                                print(f"[{camera_id}] ⚠️ LOITERING DETECTED! Track #{best_tid} dwelling for {dwell:.0f}s")
                        else:
                            # Create new track
                            with track_id_lock:
                                new_tid = next_track_id
                                next_track_id += 1
                            tracks[new_tid] = {
                                "cx": cx, "cy": cy,
                                "first_seen": current_time,
                                "last_seen": current_time,
                                "type": det.get("type", "person")
                            }
                            det["track_id"] = new_tid
                            matched_track_ids.add(new_tid)
                    
                    # Remove stale tracks (not seen for 3 seconds)
                    stale_ids = [tid for tid, t in tracks.items() if current_time - t["last_seen"] > 3.0]
                    for tid in stale_ids:
                        del tracks[tid]
                    
                    # ===== ANPR HOTLIST CHECK =====
                    for det in detections:
                        plate = det.get("plate", "")
                        if plate:
                            hotlist_match = check_plate_hotlist(plate)
                            if hotlist_match:
                                det["hotlist_match"] = True
                                det["hotlist_reason"] = hotlist_match.get("reason", "flagged")
                                cam_zone = cameras.get(camera_id)
                                zone_name = cam_zone.zone if cam_zone else "Unknown"
                                with analytics_lock:
                                    global_analytics["hotlist_hits"].append({
                                        "plate": plate,
                                        "reason": hotlist_match.get("reason", "flagged"),
                                        "zone": zone_name,
                                        "camera_id": camera_id,
                                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                    })
                                    global_analytics["hotlist_hits"] = global_analytics["hotlist_hits"][-20:]
                                print(f"[{camera_id}] 🚨 HOTLIST VEHICLE: {plate} ({hotlist_match.get('reason')})")
                    
                    # ===== FACE WATCHLIST MATCHING =====
                    for det in detections:
                        if det.get("type") == "face":
                            face_crop = frame[det["y1"]:det["y2"], det["x1"]:det["x2"]]
                            wl_match = match_face_against_watchlist(face_crop)
                            if wl_match:
                                det["watchlist_match"] = True
                                det["suspect_name"] = wl_match.get("name", "Unknown")
                                det["threat_level"] = wl_match.get("threat_level", "MEDIUM")
                                cam_zone = cameras.get(camera_id)
                                zone_name = cam_zone.zone if cam_zone else "Unknown"
                                with analytics_lock:
                                    global_analytics["watchlist_hits"].append({
                                        "suspect_name": wl_match.get("name"),
                                        "threat_level": wl_match.get("threat_level"),
                                        "zone": zone_name,
                                        "camera_id": camera_id,
                                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                    })
                                    global_analytics["watchlist_hits"] = global_analytics["watchlist_hits"][-20:]
                                print(f"[{camera_id}] 🔴 WATCHLIST MATCH: {wl_match.get('name')} (Threat: {wl_match.get('threat_level')})")
                    
                    if detections:
                        face_count = len([d for d in detections if d.get("type") == "face"])
                        person_count = len([d for d in detections if d.get("type") == "person"])
                        print(f"[{camera_id}] Detected {len(detections)} people ({face_count} faces, {person_count} bodies)")
                    
                    camera_detections[camera_id] = detections
                    camera_last_detection_time[camera_id] = current_time
                    last_yolo_time = current_time
                    
                    # Real-time Alert Sync
                    if ALERTS_ENABLED:
                        cam_data = cameras.get(camera_id)
                        if cam_data and cam_data.enabled:
                            # Use manual capacity if configured, otherwise default
                            capacity = cam_data.capacity if cam_data.capacity is not None else 50
                            check_capacity_violation(
                                zone=cam_data.zone,
                                camera_id=camera_id,
                                people_count=len(detections),
                                max_capacity=capacity
                            )
                    
                    # Update Global Analytics
                    with analytics_lock:
                        # Reset if new day
                        today = time.strftime("%Y-%m-%d")
                        if today != global_analytics["last_reset_day"]:
                            global_analytics.update({
                                "total_visitors": 0,
                                "peak_hour": "00:00",
                                "peak_count": 0,
                                "hourly_history": [0] * 24,
                                "last_reset_day": today
                            })
                        
                        # Calculate total across all active cameras
                        current_total = sum(len(d) for d in camera_detections.values())
                        
                        # Peek count / hour
                        current_hour_idx = int(time.strftime("%H"))
                        global_analytics["hourly_history"][current_hour_idx] = max(
                            global_analytics["hourly_history"][current_hour_idx],
                            current_total
                        )
                        
                        if current_total > global_analytics["peak_count"]:
                            global_analytics["peak_count"] = current_total
                            global_analytics["peak_hour"] = time.strftime("%H:00")
                        
                        # Simple total visitors heuristic (accruing)
                        # In a real system, we'd use tracking IDs, but here we'll just 
                        # ensure total_visitors reflects at least the current instantaneous total
                        global_analytics["total_visitors"] = max(global_analytics["total_visitors"], current_total)
                        global_analytics["current_count"] = current_total  # Real-time sync
                        global_analytics["active_cameras"] = len([c for c in cameras.values() if c.enabled])

            else:
                # For MJPEG streams, sometimes read() fails but the stream is still alive
                # We try to grab/retrieve as a fallback
                cap.grab()
                ret_fallback, frame_fallback = cap.retrieve()
                if ret_fallback:
                    with camera_locks.get(camera_id, threading.Lock()):
                        camera_frames[camera_id] = frame_fallback
                else:
                    print(f"[{camera_id}] Stream disconnected")
                    break
            
            # Minimal sleep - just enough to prevent 100% CPU
            time.sleep(0.005)

        cap.release()
        time.sleep(0.5)  # Faster reconnection attempts


def start_camera_thread(camera_id: str):
    """Start capture thread for a camera"""
    if camera_id in camera_threads and camera_threads[camera_id].is_alive():
        return

    camera_locks[camera_id] = threading.Lock()
    camera_reconnect_events[camera_id] = threading.Event()
    camera_stop_events[camera_id] = threading.Event()

    thread = threading.Thread(target=capture_loop, args=(camera_id,), daemon=True)
    camera_threads[camera_id] = thread
    thread.start()
    print(f"Started capture thread for {camera_id}")


def stop_camera_thread(camera_id: str):
    """Stop capture thread for a camera"""
    if camera_id in camera_stop_events:
        camera_stop_events[camera_id].set()
    if camera_id in camera_frames:
        del camera_frames[camera_id]
    print(f"Stopped capture thread for {camera_id}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start capture threads for all cameras when server starts"""
    load_cameras_from_file()
    load_hotlist()
    load_face_watchlist()
    for camera_id in cameras:
        if cameras[camera_id].enabled:
            start_camera_thread(camera_id)
    yield
    # Stop all threads on shutdown
    for camera_id in list(camera_stop_events.keys()):
        camera_stop_events[camera_id].set()


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Health Check ==============

@app.get("/health")
def health_check():
    """Health check endpoint for Docker/HF Spaces"""
    return {
        "status": "healthy",
        "cameras_configured": len(cameras),
        "cameras_active": len([c for c in cameras.values() if c.enabled])
    }


# ============== Camera Management Endpoints ==============


@app.get("/cameras")
def list_cameras():
    """List all cameras"""
    result = []
    for cam in cameras.values():
        cam_dict = cam.model_dump()
        cam_dict["status"] = (
            "online"
            if cam.id in camera_frames and camera_frames[cam.id] is not None
            else "offline"
        )
        result.append(cam_dict)
    return {"cameras": result}


@app.post("/cameras")
def add_camera(camera: Camera):
    """Add a new camera"""
    if camera.id in cameras:
        raise HTTPException(status_code=400, detail="Camera ID already exists")

    # Auto-append /video for DroidCam URLs if not present
    if ":4747" in camera.url and not camera.url.endswith("/video"):
        camera.url = camera.url.rstrip("/") + "/video"
        print(f"Auto-appended /video to DroidCam URL: {camera.url}")

    cameras[camera.id] = camera
    save_cameras_to_file()

    if camera.enabled:
        start_camera_thread(camera.id)
        print(f"Camera {camera.id} added and thread started")

    return {"status": "created", "camera": camera.model_dump()}


@app.post("/cameras/upload")
async def upload_camera_video(camera_id: str = Form(...), file: UploadFile = File(...)):
    """Store a recorded video locally so it can be analysed like a camera source."""
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video format. Upload MP4, MOV, AVI, MKV, or WebM.",
        )

    os.makedirs(VIDEO_UPLOADS_DIR, exist_ok=True)
    safe_camera_id = "".join(char for char in camera_id if char.isalnum() or char in "-_") or "camera"
    upload_path = os.path.join(VIDEO_UPLOADS_DIR, f"{safe_camera_id}_{uuid.uuid4().hex}{extension}")
    total_bytes = 0

    try:
        with open(upload_path, "wb") as destination:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_VIDEO_UPLOAD_BYTES:
                    destination.close()
                    os.remove(upload_path)
                    raise HTTPException(status_code=413, detail="Video must be 500 MB or smaller.")
                destination.write(chunk)
    except HTTPException:
        raise
    except Exception as error:
        if os.path.exists(upload_path):
            os.remove(upload_path)
        raise HTTPException(status_code=500, detail=f"Could not store video: {error}")
    finally:
        await file.close()

    return {"status": "uploaded", "url": upload_path, "filename": file.filename}


@app.get("/cameras/{camera_id}")
def get_camera(camera_id: str):
    """Get camera details"""
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")

    cam = cameras[camera_id]
    cam_dict = cam.model_dump()
    cam_dict["status"] = (
        "online"
        if camera_id in camera_frames and camera_frames[camera_id] is not None
        else "offline"
    )
    return cam_dict


@app.put("/cameras/{camera_id}")
def update_camera(camera_id: str, update: CameraUpdate):
    """Update camera configuration"""
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera = cameras[camera_id]
    update_data = update.model_dump(exclude_unset=True)

    # Check if URL changed - need to reconnect
    url_changed = "url" in update_data and update_data["url"] != camera.url
    enabled_changed = (
        "enabled" in update_data and update_data["enabled"] != camera.enabled
    )

    # Update camera data
    for key, value in update_data.items():
        setattr(camera, key, value)

    cameras[camera_id] = camera
    save_cameras_to_file()

    # Handle reconnection if needed
    if url_changed and camera.enabled:
        if camera_id in camera_reconnect_events:
            camera_reconnect_events[camera_id].set()

    # Handle enable/disable
    if enabled_changed:
        if camera.enabled:
            start_camera_thread(camera_id)
        else:
            stop_camera_thread(camera_id)

    return {"status": "updated", "camera": camera.model_dump()}


@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: str):
    """Delete a camera"""
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")

    stop_camera_thread(camera_id)
    del cameras[camera_id]
    save_cameras_to_file()

    return {"status": "deleted", "camera_id": camera_id}


# ============== Settings Endpoints ==============

SETTINGS_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "settings.json")

class AppSettings(BaseModel):
    lowBandwidthMode: bool = False
    privacyMaskingEnabled: bool = False
    autoRefreshInterval: int = 2000
    showDensityOverlay: bool = True
    alertSoundEnabled: bool = True
    droidCamUrl: Optional[str] = ""

# Global settings
app_settings: AppSettings = AppSettings()

def load_settings_from_file():
    """Load settings from JSON file"""
    global app_settings
    if os.path.exists(SETTINGS_CONFIG_FILE):
        try:
            with open(SETTINGS_CONFIG_FILE, "r") as f:
                data = json.load(f)
                app_settings = AppSettings(**data)
                print(f"Loaded settings from file")
        except Exception as e:
            print(f"Error loading settings: {e}")

def save_settings_to_file():
    """Save settings to JSON file"""
    try:
        with open(SETTINGS_CONFIG_FILE, "w") as f:
            json.dump(app_settings.model_dump(), f, indent=2)
        print("Settings saved to file")
    except Exception as e:
        print(f"Error saving settings: {e}")

# Load settings on startup
load_settings_from_file()

@app.get("/settings")
def get_settings():
    """Get current application settings"""
    return app_settings.model_dump()

@app.put("/settings")
def update_settings(settings: AppSettings):
    """Update application settings"""
    global app_settings
    app_settings = settings
    save_settings_to_file()
    return {"status": "updated", "settings": app_settings.model_dump()}


# ============== Legacy Single Camera Endpoints (for backward compatibility) ==============


class CameraConfig(BaseModel):
    url: str


@app.get("/config/camera")
def get_camera_config():
    """Get current camera configuration (legacy - returns first camera)"""
    if cameras:
        first_cam = list(cameras.values())[0]
        return {"url": first_cam.url}
    return {"url": ""}


@app.post("/config/camera")
def update_camera_config(config: CameraConfig):
    """Update camera URL (legacy - updates first camera or creates one)"""
    if cameras:
        first_cam_id = list(cameras.keys())[0]
        cameras[first_cam_id].url = config.url
        save_cameras_to_file()
        if first_cam_id in camera_reconnect_events:
            camera_reconnect_events[first_cam_id].set()
    else:
        new_cam = Camera(
            id="cam-1",
            name="Main Camera",
            url=config.url,
            zone="Main Plaza",
            enabled=True,
        )
        cameras[new_cam.id] = new_cam
        save_cameras_to_file()
        start_camera_thread(new_cam.id)

    return {"status": "updated", "url": config.url}


# ============== Frame & Detection Endpoints ==============


def get_frame_for_camera(camera_id: Optional[str] = None):
    """Get frame for a specific camera or first available camera"""
    if camera_id:
        if camera_id not in camera_frames:
            return None
        with camera_locks.get(camera_id, threading.Lock()):
            frame = camera_frames.get(camera_id)
            return frame.copy() if frame is not None else None

    # Default: return first available frame
    for cid, frame in camera_frames.items():
        if frame is not None:
            with camera_locks.get(cid, threading.Lock()):
                return frame.copy()
    return None


@app.get("/get-frame")
def get_frame(camera_id: Optional[str] = None):
    """Return the current frame as base64 encoded image"""
    frame = get_frame_for_camera(camera_id)
    if frame is None:
        return JSONResponse(content={"error": "No frame available"}, status_code=503)

    frame = frame.copy()
    _, jpeg = cv2.imencode(".jpg", frame)
    image_base64 = base64.b64encode(jpeg.tobytes()).decode("utf-8")

    return JSONResponse(content={"image": image_base64})


@app.get("/get-image-with-boxes")
def get_image_with_boxes(camera_id: Optional[str] = None):
    """Return image with bounding boxes superimposed from cache"""
    actual_id = camera_id
    if not actual_id and camera_frames:
        actual_id = list(camera_frames.keys())[0]
        
    frame = get_frame_for_camera(actual_id)
    if frame is None:
        return JSONResponse(content={"error": "No frame available"}, status_code=503)

    frame = frame.copy()
    bounding_boxes = camera_detections.get(actual_id, [])

    for box in bounding_boxes:
        x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    _, jpeg = cv2.imencode(".jpg", frame)
    image_base64 = base64.b64encode(jpeg.tobytes()).decode("utf-8")

    return JSONResponse(
        content={
            "image": image_base64,
            "persons": bounding_boxes,
            "person_count": len(bounding_boxes),
        }
    )


@app.get("/detect")
def detect(camera_id: Optional[str] = None):
    """Return only bounding boxes without the image using cache"""
    # Find actual camera ID
    actual_id = camera_id
    if not actual_id and camera_frames:
        actual_id = list(camera_frames.keys())[0]
        
    if not actual_id or actual_id not in camera_frames:
        return JSONResponse(content={"error": "No frame available"}, status_code=503)

    bounding_boxes = camera_detections.get(actual_id, [])
    
    # Format for response
    formatted_boxes = []
    for det in bounding_boxes:
        formatted_boxes.append({
            "x1": det["x1"], "y1": det["y1"], 
            "x2": det["x2"], "y2": det["y2"],
            "confidence": det.get("conf", 0.0)
        })

    return JSONResponse(
        content={"persons": formatted_boxes, "person_count": len(formatted_boxes)}
    )


@app.get("/analytics")
def analytics(camera_id: Optional[str] = None):
    """Return analytics data including people count and density from cache"""
    actual_id = camera_id
    if not actual_id and camera_frames:
        actual_id = list(camera_frames.keys())[0]
        
    frame = get_frame_for_camera(actual_id)
    if frame is None:
        return JSONResponse(content={"error": "No frame available"}, status_code=503)

    bounding_boxes = camera_detections.get(actual_id, [])
    person_count = len(bounding_boxes)

    frame_height, frame_width = frame.shape[:2]
    frame_area = frame_height * frame_width
    max_capacity = frame_area / 10000
    density_percentage = (
        min(100, int((person_count / max_capacity) * 100)) if max_capacity > 0 else 0
    )

    return JSONResponse(
        content={
            "people_count": person_count,
            "density": density_percentage,
            "timestamp": time.time(),
            "camera_id": actual_id or "default",
        }
    )


@app.get("/analytics/global")
def get_global_analytics_endpoint():
    """Return aggregated stats for the entire app dashboard"""
    with analytics_lock:
        data = global_analytics.copy()
        
    # Add status of alerts
    if ALERTS_ENABLED:
        recent_alerts = get_alert_history(10)
        data["recent_alerts"] = [a.model_dump() for a in recent_alerts]
        data["alerts_enabled"] = True
    else:
        data["recent_alerts"] = []
        data["alerts_enabled"] = False
        
    return JSONResponse(content=data)


@app.get("/analytics/all")
def analytics_all():
    """Return aggregated analytics from all cameras using cache"""
    total_count = 0
    camera_analytics = []

    for cid in cameras:
        detections = camera_detections.get(cid, [])
        person_count = len(detections)
        total_count += person_count

        frame = get_frame_for_camera(cid)
        if frame is None:
            camera_analytics.append({
                "camera_id": cid,
                "camera_name": cameras[cid].name,
                "zone": cameras[cid].zone,
                "people_count": 0,
                "density": 0,
                "status": "offline",
            })
            continue

        frame_height, frame_width = frame.shape[:2]
        frame_area = frame_height * frame_width
        max_capacity = frame_area / 10000
        density_percentage = (
            min(100, int((person_count / max_capacity) * 100))
            if max_capacity > 0
            else 0
        )

        camera_analytics.append({
            "camera_id": cid,
            "camera_name": cameras[cid].name,
            "zone": cameras[cid].zone,
            "people_count": person_count,
            "density": density_percentage,
            "status": "online",
        })

    return JSONResponse(
        content={
            "total_people_count": total_count,
            "cameras": camera_analytics,
            "timestamp": time.time(),
        }
    )

    return JSONResponse(
        content={
            "total_people_count": total_count,
            "cameras": camera_analytics,
            "timestamp": time.time(),
        }
    )


# Define zones for coordinate mapping
ZONES = [
    {"id": "entry", "name": "Entry Gate", "x_range": (0, 20), "y_range": (40, 60)},
    {"id": "main", "name": "Main Plaza", "x_range": (20, 70), "y_range": (20, 70)},
    {"id": "stage", "name": "Stage Area", "x_range": (20, 70), "y_range": (0, 25)},
    {"id": "food", "name": "Food Court", "x_range": (70, 100), "y_range": (20, 55)},
    {"id": "exit", "name": "Exit Gate", "x_range": (70, 100), "y_range": (60, 90)},
    {"id": "parking", "name": "Parking", "x_range": (0, 30), "y_range": (70, 100)},
    {"id": "vip", "name": "VIP Area", "x_range": (70, 100), "y_range": (0, 25)},
]


def get_zone_for_position(x_percent, y_percent):
    """Determine which zone a position falls into"""
    for zone in ZONES:
        x_min, x_max = zone["x_range"]
        y_min, y_max = zone["y_range"]
        if x_min <= x_percent <= x_max and y_min <= y_percent <= y_max:
            return zone["name"]
    return "Main Plaza"


@app.get("/coordinates")
def coordinates(camera_id: Optional[str] = None):
    """Return lightweight coordinate data for low-bandwidth mode using cached detections"""
    frame = get_frame_for_camera(camera_id)
    if frame is None:
        return JSONResponse(
            content={
                "timestamp": int(time.time() * 1000),
                "people": [], "count": 0, "density": 0,
                "camera_id": camera_id or "default",
                "error": "No frame available"
            },
            status_code=200
        )

    # Use actual camera ID for cache lookup
    actual_id = camera_id
    if not actual_id and camera_frames:
        actual_id = list(camera_frames.keys())[0]
        
    detections = camera_detections.get(actual_id, [])
    
    frame_height, frame_width = frame.shape[:2]
    people = []
    for i, det in enumerate(detections):
        center_x = ((det["x1"] + det["x2"]) / 2) / frame_width * 100
        center_y = ((det["y1"] + det["y2"]) / 2) / frame_height * 100
        zone = get_zone_for_position(center_x, center_y)
        people.append({
            "id": i + 1,
            "x": round(center_x, 1),
            "y": round(center_y, 1),
            "zone": zone,
        })

    frame_area = frame_height * frame_width
    max_capacity = frame_area / 10000
    density_percentage = (
        min(100, int((len(people) / max_capacity) * 100)) if max_capacity > 0 else 0
    )

    return JSONResponse(
        content={
            "timestamp": int(time.time() * 1000),
            "people": people,
            "count": len(people),
            "density": density_percentage,
            "camera_id": actual_id or "default",
        }
    )


# ============== Streaming Endpoints ==============


def generate_stream(camera_id: Optional[str] = None):
    """Generator function for MJPEG streaming"""
    print(f"[STREAM] Starting stream for camera_id: {camera_id}")
    while True:
        frame = None
        target_camera = camera_id
        
        # If no camera_id provided, try to pick the first one
        if not target_camera and camera_frames:
            target_camera = list(camera_frames.keys())[0]

        if target_camera and target_camera in camera_frames:
            with camera_locks.get(target_camera, threading.Lock()):
                if camera_frames.get(target_camera) is not None:
                    frame = camera_frames[target_camera].copy()

        if frame is None:
            time.sleep(0.02)
            continue

        # Encode with balanced quality for speed
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]
        _, jpeg = cv2.imencode(".jpg", frame, encode_params)
        yield (
            b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
        )
        time.sleep(0.025)  # ~40 FPS for smoother streaming


@app.get("/stream")
def stream(camera_id: Optional[str] = None):
    """Return MJPEG video stream"""
    return StreamingResponse(
        generate_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


def generate_stream_with_boxes(camera_id: Optional[str] = None):
    """Generator function for MJPEG streaming with bounding boxes from cache"""
    print(f"[STREAM-BOXES] Starting stream for camera_id: {camera_id}")
    while True:
        frame = None
        current_cid = camera_id
        
        if not current_cid and camera_frames:
            current_cid = list(camera_frames.keys())[0]

        if current_cid and current_cid in camera_frames:
            with camera_locks.get(current_cid, threading.Lock()):
                if camera_frames.get(current_cid) is not None:
                    frame = camera_frames[current_cid].copy()

        if frame is None:
            time.sleep(0.02)
            continue

        # Use cached detections
        bounding_boxes = camera_detections.get(current_cid, [])
        
        # Draw Virtual Fence
        h, w = frame.shape[:2]
        fence_pts = np.array([[(int(w*0.3), int(h*0.3)), (int(w*0.7), int(h*0.3)), (int(w*0.7), int(h*0.7)), (int(w*0.3), int(h*0.7))]], dtype=np.int32)
        cv2.polylines(frame, fence_pts, isClosed=True, color=(255, 255, 0), thickness=2) # Cyan color for fence
        cv2.putText(frame, "RESTRICTED ZONE", (int(w*0.3), int(h*0.3) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)
        
        for box in bounding_boxes:
            x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
            b_type = box.get("type", "person")
            plate = box.get("plate", "")
            intruding = box.get("intruding", False)
            loitering = box.get("loitering", False)
            hotlist_match = box.get("hotlist_match", False)
            watchlist_match = box.get("watchlist_match", False)
            track_id = box.get("track_id", "")
            
            # Determine color priority: watchlist > hotlist > loitering > intrusion > normal
            if watchlist_match:
                color = (0, 0, 255)  # Bright red for watchlist suspect
                thickness = 3
            elif hotlist_match:
                color = (0, 0, 255)  # Red for hotlist vehicle
                thickness = 3
            elif loitering:
                color = (0, 165, 255)  # Orange for loitering
                thickness = 3
            elif intruding:
                color = (0, 0, 255)  # Red for intruding
                thickness = 2
            elif b_type == "person":
                color = (0, 255, 0)  # Green
                thickness = 2
            elif b_type == "face":
                color = (0, 255, 255)  # Yellow
                thickness = 2
            else:
                color = (255, 0, 0)  # Blue for vehicles
                thickness = 2
                
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
            
            # Build label
            label_parts = []
            if watchlist_match:
                label_parts.append(f"SUSPECT: {box.get('suspect_name', '?')} [{box.get('threat_level', '?')}]")
            elif b_type.upper() != "FACE":
                label_parts.append(b_type.upper())
            
            if track_id:
                label_parts.append(f"ID:{track_id}")
            if loitering:
                label_parts.append(f"LOITERING {box.get('dwell_time', 0)}s")
            if intruding:
                label_parts.append("INTRUSION")
            if hotlist_match:
                label_parts.append(f"WANTED [{box.get('hotlist_reason', 'flagged').upper()}]")
            if plate:
                label_parts.append(plate)
                
            label = " | ".join(label_parts)
            
            # Draw label background for readability
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            label_y = max(y1 - 10, th + 5)
            cv2.rectangle(frame, (x1, label_y - th - 4), (x1 + tw + 4, label_y + 4), (0, 0, 0), -1)
            cv2.putText(frame, label, (x1 + 2, label_y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        person_count = len([b for b in bounding_boxes if b.get("type") in ["person", "face"]])
        vehicle_count = len([b for b in bounding_boxes if b.get("type") in ["car", "truck", "motorcycle", "bus"]])
        loiter_count = len([b for b in bounding_boxes if b.get("loitering")])
        
        # Draw HUD overlay
        hud_lines = [
            f"TRINETRA // HUMANS: {person_count} | VEHICLES: {vehicle_count}",
        ]
        if loiter_count > 0:
            hud_lines.append(f"!! LOITERING ALERTS: {loiter_count}")
        
        for i, line in enumerate(hud_lines):
            y_pos = 30 + i * 25
            cv2.putText(frame, line, (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        # Encode with balanced quality for smooth streaming
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 70]
        _, jpeg = cv2.imencode(".jpg", frame, encode_params)

        yield (
            b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
        )
        time.sleep(0.025)  # ~40 FPS for smoother streaming


@app.get("/stream-with-boxes")
def stream_with_boxes(camera_id: Optional[str] = None):
    """Return MJPEG video stream with bounding boxes"""
    return StreamingResponse(
        generate_stream_with_boxes(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


def blur_faces(frame):
    """Apply blur to detected faces in the frame"""
    try:
        if face_cascade is None or face_cascade.empty():
            return frame, 0

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        for x, y, w, h in faces:
            x = max(0, x)
            y = max(0, y)
            w = min(w, frame.shape[1] - x)
            h = min(h, frame.shape[0] - y)

            if w > 0 and h > 0:
                face_region = frame[y : y + h, x : x + w]
                if face_region.size > 0:
                    blur_size = min(99, max(21, (w // 2) * 2 + 1))
                    blurred_face = cv2.GaussianBlur(
                        face_region, (blur_size, blur_size), 30
                    )
                    frame[y : y + h, x : x + w] = blurred_face

        return frame, len(faces)
    except Exception as e:
        print(f"Error in blur_faces: {e}")
        return frame, 0


def blur_upper_body(frame, bounding_boxes):
    """Blur upper portion of detected person bounding boxes"""
    try:
        faces_blurred = 0
        frame_height, frame_width = frame.shape[:2]

        for box in bounding_boxes:
            x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
            head_height = int((y2 - y1) * 0.3)
            head_y2 = y1 + head_height

            x1 = max(0, min(x1, frame_width - 1))
            y1 = max(0, min(y1, frame_height - 1))
            x2 = max(0, min(x2, frame_width))
            head_y2 = max(0, min(head_y2, frame_height))

            width = x2 - x1
            height = head_y2 - y1

            if height > 0 and width > 0:
                head_region = frame[y1:head_y2, x1:x2]
                if head_region.size > 0:
                    try:
                        small = cv2.resize(
                            head_region,
                            (max(1, 8), max(1, 8)),
                            interpolation=cv2.INTER_LINEAR,
                        )
                        pixelated = cv2.resize(
                            small, (width, height), interpolation=cv2.INTER_NEAREST
                        )
                        frame[y1:head_y2, x1:x2] = pixelated
                        faces_blurred += 1
                    except Exception as resize_error:
                        print(f"Resize error: {resize_error}")

        return frame, faces_blurred
    except Exception as e:
        print(f"Error in blur_upper_body: {e}")
        return frame, 0


def generate_stream_with_privacy(camera_id: Optional[str] = None):
    """Generator function for MJPEG streaming with privacy masking from cache"""
    while True:
        try:
            frame = None
            current_cid = camera_id
            
            if not current_cid and camera_frames:
                current_cid = list(camera_frames.keys())[0]

            if current_cid and current_cid in camera_frames:
                with camera_locks.get(current_cid, threading.Lock()):
                    if camera_frames.get(current_cid) is not None:
                        frame = camera_frames[current_cid].copy()

            if frame is None:
                time.sleep(0.1)
                continue

            # Use cached detections
            detections = camera_detections.get(current_cid, [])
            
            # Format boxes for masking
            formatted_boxes = []
            for det in detections:
                formatted_boxes.append({
                    "x1": det["x1"], 
                    "y1": det["y1"], 
                    "x2": det["x2"], 
                    "y2": det["y2"]
                })

            frame, _ = blur_upper_body(frame, formatted_boxes)
            frame, _ = blur_faces(frame)

            cv2.putText(
                frame,
                f"Persons: {len(detections)}",
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2,
            )
            cv2.putText(
                frame,
                "PRIVACY MODE",
                (10, 80),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 0, 255),
                2,
            )

            _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            time.sleep(0.04)
        except Exception as e:
            print(f"Error in privacy stream: {e}")
            time.sleep(0.1)


@app.get("/stream-with-privacy")
def stream_with_privacy(camera_id: Optional[str] = None):
    """Return MJPEG video stream with privacy masking"""
    return StreamingResponse(
        generate_stream_with_privacy(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ============== Alert System Endpoints ==============

# Import the alert module
try:
    from twilio_alerts import (
        AlertConfig as TwilioAlertConfig,
        get_alert_config,
        update_alert_config,
        get_alert_history,
        trigger_emergency_alert,
        check_capacity_violation,
        acknowledge_alert,
        send_whatsapp_alert,
    )
    ALERTS_ENABLED = True
except ImportError as e:
    print(f"Alert module not available: {e}")
    ALERTS_ENABLED = False


class EmergencyRequest(BaseModel):
    """Request model for emergency triggers"""
    zone: str = "Unknown"
    reason: str = ""
    camera_id: str = ""


class AlertConfigRequest(BaseModel):
    """Request model for alert configuration"""
    whatsappEnabled: bool = False
    whatsappNumber: str = ""
    alertCooldownMinutes: int = 5
    twilioAccountSid: str = ""
    twilioAuthToken: str = ""
    twilioWhatsappNumber: str = "whatsapp:+14155238886"
    prototypeMode: bool = True
    emergencyContacts: list = []


class CapacityCheckRequest(BaseModel):
    """Request model for zone capacity checks"""
    camera_id: str
    zone: str
    people_count: int
    max_capacity: int


@app.get("/api/alert/config")
def get_alert_configuration():
    """Get current alert configuration"""
    if not ALERTS_ENABLED:
        return {"error": "Alert system not available", "enabled": False}
    
    config = get_alert_config()
    # Don't expose sensitive tokens in response
    return {
        "whatsappEnabled": config.whatsappEnabled,
        "whatsappNumber": config.whatsappNumber,
        "alertCooldownMinutes": config.alertCooldownMinutes,
        "twilioConfigured": bool(config.twilioAccountSid and config.twilioAuthToken),
        "prototypeMode": config.prototypeMode,
        "emergencyContacts": config.emergencyContacts,
        "enabled": True
    }


@app.put("/api/alert/config")
def update_alert_configuration(config: AlertConfigRequest):
    """Update alert configuration"""
    if not ALERTS_ENABLED:
        raise HTTPException(status_code=503, detail="Alert system not available")
    
    new_config = TwilioAlertConfig(
        whatsappEnabled=config.whatsappEnabled,
        whatsappNumber=config.whatsappNumber,
        alertCooldownMinutes=config.alertCooldownMinutes,
        twilioAccountSid=config.twilioAccountSid,
        twilioAuthToken=config.twilioAuthToken,
        twilioWhatsappNumber=config.twilioWhatsappNumber,
        prototypeMode=config.prototypeMode,
        emergencyContacts=config.emergencyContacts
    )
    updated = update_alert_config(new_config)
    return {"status": "updated", "config": {
        "whatsappEnabled": updated.whatsappEnabled,
        "whatsappNumber": updated.whatsappNumber,
        "alertCooldownMinutes": updated.alertCooldownMinutes,
        "prototypeMode": updated.prototypeMode,
    }}


@app.post("/api/alert/emergency")
def trigger_emergency(request: EmergencyRequest):
    """Trigger a manual emergency alert"""
    if not ALERTS_ENABLED:
        raise HTTPException(status_code=503, detail="Alert system not available")
    
    result = trigger_emergency_alert(
        zone=request.zone,
        reason=request.reason or "Manual emergency trigger from TRINETRA"
    )
    
    return {
        "status": "triggered",
        "result": result,
        "message": "Emergency alert triggered successfully"
    }


@app.post("/api/alert/test")
def test_alert():
    """Send a test alert to verify WhatsApp configuration"""
    if not ALERTS_ENABLED:
        raise HTTPException(status_code=503, detail="Alert system not available")
    
    result = send_whatsapp_alert(
        alert_type="system_error",
        zone="Test Zone",
        reason="This is a test alert from TRINETRA to verify your WhatsApp configuration."
    )
    
    return {
        "status": "sent" if result.get("success") else "failed",
        "result": result
    }


@app.get("/api/alert/history")
def get_alerts(limit: int = 50):
    """Get recent alert history"""
    if not ALERTS_ENABLED:
        return {"alerts": [], "enabled": False}
    
    alerts = get_alert_history(limit)
    return {
        "alerts": [alert.model_dump() for alert in alerts],
        "count": len(alerts),
        "enabled": True
    }


@app.post("/api/alert/acknowledge/{alert_id}")
def acknowledge_alert_endpoint(alert_id: str):
    """Acknowledge an alert"""
    if not ALERTS_ENABLED:
        raise HTTPException(status_code=503, detail="Alert system not available")
    
    success = acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "acknowledged", "alert_id": alert_id}


@app.post("/api/alert/check-capacity")
def check_zone_capacity(request: CapacityCheckRequest):
    """Check if a zone has capacity violation and trigger alert if needed"""
    if not ALERTS_ENABLED:
        return {"checked": False, "enabled": False}
    
    result = check_capacity_violation(
        zone=request.zone,
        camera_id=request.camera_id,
        people_count=request.people_count,
        max_capacity=request.max_capacity
    )
    
    return {
        "checked": True,
        "violation_detected": result is not None,
        "alert_result": result
    }


# ============== ANPR HOTLIST ENDPOINTS ==============

class PlateEntry(BaseModel):
    plate: str
    reason: str = "flagged"

@app.get("/watchlist/plates")
def get_hotlist():
    """Get all ANPR hotlist entries"""
    return {"plates": anpr_hotlist}

@app.post("/watchlist/plates")
def add_plate(entry: PlateEntry):
    """Add a plate to the ANPR hotlist"""
    anpr_hotlist.append({"plate": entry.plate.upper(), "reason": entry.reason})
    save_hotlist()
    return {"status": "added", "plate": entry.plate.upper()}

@app.delete("/watchlist/plates/{plate}")
def remove_plate(plate: str):
    """Remove a plate from the ANPR hotlist"""
    global anpr_hotlist
    anpr_hotlist = [p for p in anpr_hotlist if p["plate"].upper() != plate.upper()]
    save_hotlist()
    return {"status": "removed", "plate": plate}


# ============== FACE WATCHLIST ENDPOINTS ==============

@app.get("/watchlist/faces")
def get_face_watchlist():
    """Get all face watchlist entries"""
    return {"faces": [{k: v for k, v in f.items() if not k.startswith("_")} for f in face_watchlist]}

@app.post("/watchlist/faces")
async def add_face(
    name: str = Form(...),
    threat_level: str = Form("MEDIUM"),
    file: UploadFile = File(...)
):
    """Add a face to the watchlist"""
    face_id = str(uuid.uuid4())[:8]
    filename = f"{face_id}_{file.filename}"
    filepath = os.path.join(WATCHLIST_DIR, filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Compute histogram for matching
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    hist_data = None
    if img is not None:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hist_data = cv2.calcHist([gray], [0], None, [256], [0, 256])
        cv2.normalize(hist_data, hist_data)
    
    entry = {
        "id": face_id,
        "name": name,
        "threat_level": threat_level,
        "file": filename,
        "added_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    if hist_data is not None:
        entry["_hist"] = hist_data
    
    face_watchlist.append(entry)
    save_face_watchlist()
    
    return {"status": "added", "id": face_id, "name": name}

@app.delete("/watchlist/faces/{face_id}")
def remove_face(face_id: str):
    """Remove a face from the watchlist"""
    global face_watchlist
    # Delete the image file
    for entry in face_watchlist:
        if entry.get("id") == face_id:
            img_path = os.path.join(WATCHLIST_DIR, entry.get("file", ""))
            if os.path.exists(img_path):
                os.remove(img_path)
            break
    face_watchlist = [f for f in face_watchlist if f.get("id") != face_id]
    save_face_watchlist()
    return {"status": "removed", "id": face_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
