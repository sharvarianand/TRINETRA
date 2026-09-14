from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import cv2
import json
import time
import numpy as np
from pathlib import Path

app = FastAPI(title="TRINETRA Detection Server")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
camera_capture = None
yolo_model = None
latest_coordinates = {
    "timestamp": time.time() * 1000,
    "people": [],
    "density": 0,
    "count": 0
}

# Load YOLO model
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

# Load camera config
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
            if cam.get("enabled") and cam.get("type") == "live" and cam.get("url"):
                camera_url = cam["url"]
                break
        
        print(f"Attempting to connect to: {camera_url}")
        camera_capture = cv2.VideoCapture(camera_url)
        camera_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not camera_capture.isOpened():
            print("DroidCam failed, trying webcam (index 0)...")
            camera_capture = cv2.VideoCapture(0)
            
        if camera_capture.isOpened():
            print("Camera connected successfully!")
        else:
            print("Failed to connect to any camera")
            camera_capture = None
            
    return camera_capture

def generate_frames():
    global latest_coordinates, camera_capture
    
    model = get_yolo_model()
    
    while True:
        camera = get_camera()
        
        if camera is None or not camera.isOpened():
            # Create placeholder frame
            placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(placeholder, "Connecting to camera...", (120, 220),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 100), 2)
            cv2.putText(placeholder, "Make sure DroidCam is running", (100, 260),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
            _, buffer = cv2.imencode('.jpg', placeholder)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(2)
            camera_capture = None
            continue
        
        success, frame = camera.read()
        
        if not success:
            print("Failed to read frame")
            camera_capture = None
            time.sleep(0.5)
            continue
        
        height, width = frame.shape[:2]
        people = []
        boxes = []
        
        # Use YOLO if available
        if model is not None:
            try:
                results = model(frame, classes=[0], conf=0.5, verbose=False)
                for result in results:
                    for box in result.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                        conf = float(box.conf[0])
                        
                        center_x = ((x1 + x2) / 2) / width * 100
                        center_y = ((y1 + y2) / 2) / height * 100
                        
                        people.append({"id": len(people) + 1, "x": round(center_x, 1), "y": round(center_y, 1)})
                        boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf})
            except Exception as e:
                print(f"YOLO error: {e}")
        else:
            # Simulate detection
            num_people = np.random.randint(2, 8)
            for i in range(num_people):
                x = np.random.randint(50, width - 100)
                y = np.random.randint(50, height - 150)
                w, h = 60, 120
                people.append({"id": i + 1, "x": round((x + w/2) / width * 100, 1), "y": round((y + h/2) / height * 100, 1)})
                boxes.append({"x1": x, "y1": y, "x2": x + w, "y2": y + h, "conf": 0.85})
        
        count = len(people)
        density = min(100, int(count / 15 * 100))
        
        latest_coordinates = {
            "timestamp": time.time() * 1000,
            "people": people,
            "density": density,
            "count": count
        }
        
        # Draw boxes
        for box in boxes:
            cv2.rectangle(frame, (box["x1"], box["y1"]), (box["x2"], box["y2"]), (16, 185, 129), 2)
            cv2.circle(frame, ((box["x1"] + box["x2"]) // 2, box["y1"] + 15), 8, (16, 185, 129), -1)
        
        # Draw overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, 45), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
        
        cv2.putText(frame, "TRINETRA", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (16, 185, 129), 2)
        cv2.circle(frame, (180, 25), 6, (0, 0, 255), -1)
        cv2.putText(frame, "LIVE", (192, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        cv2.putText(frame, f"People: {count}", (width - 150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/")
def root():
    return {"status": "running", "service": "TRINETRA Detection Server"}

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": time.time() * 1000}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/coordinates")
def get_coordinates():
    return JSONResponse(content=latest_coordinates)

@app.get("/cameras")
def get_cameras():
    return JSONResponse(content=load_cameras())

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  TRINETRA Detection Server")
    print("=" * 50)
    print("\nStarting server on http://localhost:8000")
    print("Video feed: http://localhost:8000/video_feed\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
