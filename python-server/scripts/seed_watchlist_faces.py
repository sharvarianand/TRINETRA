"""Seed the face watchlist so face matching is demonstrable.

Detection boxes from a 768x432 video crop are ~50x30px and contain no
detectable face, so nothing ever matches from the sample footage. This enrolls
a high-resolution portrait instead, which the matching pipeline can verify.

    python scripts/seed_watchlist_faces.py

Run face_worker.py against the same image afterwards and it should report a
match; run it against bus.jpg and it should report none.
"""
import os
import sys

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WATCHLIST_DIR = os.path.join(SERVER_DIR, "watchlist_faces")

# Bundled with ultralytics; a clear, reasonably sized portrait.
SOURCE_IMAGE = os.path.join(
    SERVER_DIR, "venv/lib/python3.12/site-packages/ultralytics/assets/zidane.jpg"
)


def main():
    import cv2
    from deepface import DeepFace

    if not os.path.exists(SOURCE_IMAGE):
        print(f"Source image not found: {SOURCE_IMAGE}")
        return 1

    os.makedirs(WATCHLIST_DIR, exist_ok=True)
    img = cv2.imread(SOURCE_IMAGE)
    detected = DeepFace.extract_faces(
        img_path=img, detector_backend="mtcnn", enforce_detection=False
    )
    real = [
        f for f in detected
        if not (f["facial_area"]["w"] > img.shape[1] * 0.9
                and f["facial_area"]["h"] > img.shape[0] * 0.9)
    ]
    if not real:
        print("No face detected in the source image.")
        return 1

    # Crop from the BGR original, not from extract_faces' RGB output, to match
    # how face_worker.py takes its probe crop.
    area = real[0]["facial_area"]
    face = img[area["y"]:area["y"] + area["h"], area["x"]:area["x"] + area["w"]]

    out = os.path.join(WATCHLIST_DIR, "demo_suspect.jpg")
    cv2.imwrite(out, face)
    print(f"Seeded watchlist face -> {out} ({face.shape[1]}x{face.shape[0]})")
    print(f"Match it against the source: {os.path.basename(SOURCE_IMAGE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
