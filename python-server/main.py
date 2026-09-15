import os
import json
import time
import numpy as np
import cv2
import shutil
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

os.makedirs("uploads", exist_ok=True)

camera_capture = None
yolo_model = None
latest_coordinates = {
    "timestamp": time.time() * 1000,
    "people": [],
    "density": 0,
    "count": 0
}

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
        print(f"Error loading cameras.json: {e}")
        return {"cameras": []}

def get_camera():
    global camera_capture
    if camera_capture is None or not camera_capture.isOpened():
        cameras = load_cameras()
        camera_url = "http://10.180.217.71:4747/video"
        
        for cam in cameras.get("cameras", []):
            if cam.get("enabled") and cam.get("url"):
                camera_url = cam["url"]
                break
        
        print(f"Attempting to connect to: {camera_url}")
        camera_capture = cv2.VideoCapture(camera_url)
        
        if not camera_capture.isOpened():
            print("Failed, trying webcam (index 0)...")
            camera_capture = cv2.VideoCapture(0)
            
    return camera_capture

def generate_frames():
    global latest_coordinates, camera_capture
    model = get_yolo_model()
    
    while True:
        camera = get_camera()
        
        if camera is None or not camera.isOpened():
            placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(placeholder, "Connecting to camera...", (120, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 100), 2)
            _, buffer = cv2.imencode('.jpg', placeholder)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
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
        
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/coordinates")
def get_coordinates():
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

@app.post("/cameras/upload")
async def upload_video(camera_id: str = Form(...), file: UploadFile = File(...)):
    file_extension = file.filename.split(".")[-1]
    safe_filename = f"{camera_id}.{file_extension}"
    file_path = os.path.join("uploads", safe_filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "url": file_path}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
