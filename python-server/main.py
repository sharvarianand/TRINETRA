import os
import json
import time
import numpy as np
import cv2
import shutil
import threading
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

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
os.makedirs("watchlist_faces", exist_ok=True)

camera_capture = None
yolo_model = None
latest_coordinates = {
    "timestamp": time.time() * 1000,
    "people": [],
    "density": 0,
    "count": 0
}

latest_frame_boxes = None
latest_frame_privacy = None
current_camera_url = None

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            print("Loading YOLOv8 model...")
            yolo_model = YOLO("yolov8n.pt")
            print("YOLOv8 model loaded!")
        except Exception as e:
            print(f"YOLO not available: {e}")
            yolo_model = None
    return yolo_model

def load_cameras():
    config_path = Path(__file__).parent / "cameras.json"
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception as e:
        return {"cameras": []}

def get_camera():
    global camera_capture, current_camera_url
    
    cameras = load_cameras()
    target_url = None
    
    for cam in cameras.get("cameras", []):
        if cam.get("enabled") and cam.get("url"):
            target_url = cam["url"]
            break
            
    if target_url is None:
        if camera_capture is not None:
            camera_capture.release()
            camera_capture = None
        current_camera_url = None
        return None
            
    if camera_capture is None or not camera_capture.isOpened() or current_camera_url != target_url:
        print(f"Switching camera to: {target_url}")
        if camera_capture is not None:
            camera_capture.release()
            
        camera_capture = cv2.VideoCapture(int(target_url) if str(target_url).isdigit() else target_url)
        current_camera_url = target_url
            
    return camera_capture

def background_processing_loop():
    global latest_coordinates, camera_capture, latest_frame_boxes, latest_frame_privacy
    model = get_yolo_model()
    
    placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(placeholder, "Connecting to camera...", (120, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 100), 2)
    _, buffer_ph = cv2.imencode('.jpg', placeholder)
    ph_bytes = buffer_ph.tobytes()
    
    while True:
        try:
            camera = get_camera()
            
            if camera is None or not camera.isOpened():
                latest_frame_boxes = ph_bytes
                latest_frame_privacy = ph_bytes
                time.sleep(2)
                camera_capture = None
                continue
            
            success, frame = camera.read()
            
            if not success:
                print("Video stream ended, restarting...")
                camera_capture = None
                time.sleep(0.5)
                continue
            
            height, width = frame.shape[:2]
            people = []
            boxes = []
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            if brightness < 60:
                frame = cv2.convertScaleAbs(frame, alpha=1.3, beta=40)
                cv2.putText(frame, "NIGHT VISION ENHANCEMENT", (width // 2 - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            fence_y = int(height * 0.75)
            cv2.line(frame, (0, fence_y), (width, fence_y), (0, 0, 255), 2)
            cv2.putText(frame, "VIRTUAL FENCE ZONE", (10, fence_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            if model is not None:
                try:
                    results = model(frame, classes=[0, 2, 3, 5, 7], conf=0.4, verbose=False)
                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                            conf = float(box.conf[0])
                            cls = int(box.cls[0])
                            
                            center_x = ((x1 + x2) / 2) / width * 100
                            center_y = ((y1 + y2) / 2) / height * 100
                            
                            if cls == 0:
                                people.append({"id": len(people) + 1, "x": round(center_x, 1), "y": round(center_y, 1)})
                                boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf, "type": "person"})
                            else:
                                boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf, "type": "vehicle"})
                except Exception as e:
                    pass
            
            count = len(people)
            latest_coordinates = {
                "timestamp": time.time() * 1000,
                "people": people,
                "density": min(100, int(count / 15 * 100)),
                "count": count
            }
            
            frame_privacy = frame.copy()
            
            for box in boxes:
                is_person = box["type"] == "person"
                color = (16, 185, 129) if is_person else (255, 165, 0)
                label = "Human" if is_person else "Vehicle"
                
                if is_person and box["y2"] > fence_y:
                    color = (0, 0, 255)
                    label = "INTRUSION"
                    
                cv2.rectangle(frame, (box["x1"], box["y1"]), (box["x2"], box["y2"]), color, 2)
                cv2.putText(frame, f"{label} {box['conf']:.2f}", (box["x1"], box["y1"] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                if is_person and (box["y2"] - box["y1"]) > 50:
                    fw, fh = int((box["x2"] - box["x1"]) * 0.4), int((box["y2"] - box["y1"]) * 0.2)
                    fx, fy = box["x1"] + fw // 2 + 5, box["y1"] + int(fh * 0.2)
                    cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (255, 0, 0), 1)
                    cv2.putText(frame, "Face", (fx, fy - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)
                    
                    # Apply blur to privacy frame
                    face_roi = frame_privacy[fy:fy+fh, fx:fx+fw]
                    if face_roi.size > 0:
                        blurred_face = cv2.GaussianBlur(face_roi, (99, 99), 30)
                        frame_privacy[fy:fy+fh, fx:fx+fw] = blurred_face
                        
                elif not is_person and (box["x2"] - box["x1"]) > 60:
                    pw, ph = int((box["x2"] - box["x1"]) * 0.4), int((box["y2"] - box["y1"]) * 0.15)
                    px, py = box["x1"] + int(pw * 0.8), box["y2"] - ph - 10
                    cv2.rectangle(frame, (px, py), (px + pw, py + ph), (0, 255, 255), 2)
                    cv2.putText(frame, "ANPR", (px, py - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 2)
            
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (width, 45), (0, 0, 0), -1)
            frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
            cv2.putText(frame, "IBVAP (SSB / MHA)", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (16, 185, 129), 2)
            cv2.circle(frame, (230, 25), 6, (0, 0, 255), -1)
            cv2.putText(frame, "AI ANALYSIS ACTIVE", (245, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            
            _, buffer_boxes = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            latest_frame_boxes = buffer_boxes.tobytes()
            
            _, buffer_privacy = cv2.imencode('.jpg', frame_privacy, [cv2.IMWRITE_JPEG_QUALITY, 85])
            latest_frame_privacy = buffer_privacy.tobytes()
            
            time.sleep(0.03) # Cap at ~30 FPS to prevent 100% CPU loops on files
            
        except Exception as e:
            print(f"Loop error: {e}")
            time.sleep(1)

# Start background processing thread
threading.Thread(target=background_processing_loop, daemon=True).start()

def stream_generator(feed_type="boxes"):
    while True:
        frame_data = latest_frame_boxes if feed_type == "boxes" else latest_frame_privacy
        if frame_data is not None:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
        time.sleep(0.05)

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(stream_generator("boxes"), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stream-with-boxes")
def stream_with_boxes(camera_id: str = "cam-1"):
    return StreamingResponse(stream_generator("boxes"), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stream-with-privacy")
def stream_with_privacy(camera_id: str = "cam-1"):
    return StreamingResponse(stream_generator("privacy"), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/coordinates")
def get_coordinates(camera_id: str = None):
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
    file_path = os.path.join("watchlist_faces", safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    faces_data["faces"].append({
        "id": face_id,
        "name": name,
        "threat_level": threat_level,
        "image": file_path,
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
        "plate": plate.plate,
        "reason": plate.reason,
        "added_at": time.strftime("%Y-%m-%d %H:%M:%S")
    })
    save_json_file("watchlist_plates.json", plates_data)
    return {"status": "success"}

@app.delete("/watchlist/plates/{plate_id}")
def delete_watchlist_plate(plate_id: str):
    plates_data = load_json_file("watchlist_plates.json", "plates")
    plates_data["plates"] = [p for p in plates_data["plates"] if p["plate"] != plate_id]
    save_json_file("watchlist_plates.json", plates_data)
    return {"status": "success"}

@app.get("/analytics/global")
def get_global_analytics():
    cameras_data = load_cameras()
    active_cameras = len([c for c in cameras_data.get("cameras", []) if c.get("enabled")])
    count = latest_coordinates.get("count", 0)
    density = latest_coordinates.get("density", 0)
    hourly_history = [12, 18, 9, 5, 7, 14, 35, 67, 82, 95, 88, 102, 115, 108, 98, 110, 121, 134, 118, 95, 76, 54, 38, 22]
    return JSONResponse(content={
        "total_visitors": sum(hourly_history),
        "current_count": count,
        "peak_hour": "13:00",
        "peak_count": max(hourly_history),
        "hourly_history": hourly_history,
        "active_cameras": active_cameras,
        "density": density,
        "recent_alerts": []
    })

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)





