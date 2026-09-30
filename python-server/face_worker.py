"""Isolated DeepFace worker.

DeepFace (TensorFlow/Keras) and Ultralytics YOLO (PyTorch) cannot coexist in one
interpreter: importing both and calling either crashes the process with
"free(): invalid pointer". So face matching runs here in a separate process and
talks to the parent over stdout as a single JSON line.

Usage:  python face_worker.py <crop_path> <watchlist_dir>
Prints: {"match": "<identity or null>", "distance": <float or null>, "error": <str or null>}
"""
import sys
import os
import json

import cv2

# Cosine similarity above this counts as the same person. Same face scores >0.90,
# distinct faces score ~0.10-0.35, noise/background scores ~0.45-0.55.
MATCH_THRESHOLD = 0.75
MODEL = "Facenet"


def main():
    crop_path, watchlist_dir = sys.argv[1], sys.argv[2]
    result = {"match": None, "distance": None, "error": None}
    try:
        import numpy as np
        from deepface import DeepFace

        if not os.path.isdir(watchlist_dir) or not os.listdir(watchlist_dir):
            result["error"] = "empty_watchlist"
            print(json.dumps(result))
            return

        img = cv2.imread(crop_path)
        if img is None:
            result["error"] = "unreadable_crop"
            print(json.dumps(result))
            return

        # Locate an actual face in the crop and use that, rather than the whole
        # guessed box. With enforce_detection=False, MTCNN returns the entire
        # image when it finds nothing, so that case is rejected explicitly.
        # Skipping this check made low-res crops of hair/background score ~0.97
        # against any watchlist face, i.e. every match was a false positive.
        detected = DeepFace.extract_faces(
            img_path=img, detector_backend="mtcnn", enforce_detection=False
        )
        real = [
            f for f in detected
            if f.get("confidence", 0) > 0.4 and f.get("facial_area", {}).get("left_eye") is not None
        ]

        if real:
            area = real[0]["facial_area"]
            face_bgr = img[
                max(0, area["y"]):min(img.shape[0], area["y"] + area["h"]),
                max(0, area["x"]):min(img.shape[1], area["x"] + area["w"]),
            ]
            if face_bgr.size == 0:
                face_bgr = img
        elif img.shape[0] >= 30 and img.shape[1] >= 30:
            # The probe is already an extracted face crop from Haar cascade
            face_bgr = img
        else:
            result["error"] = "no_face_detected"
            print(json.dumps(result))
            return
        if face_bgr.size == 0:
            result["error"] = "empty_face_crop"
            print(json.dumps(result))
            return

        probe = DeepFace.represent(
            img_path=face_bgr, model_name=MODEL, detector_backend="skip"
        )[0]["embedding"]

        best_score, best_id = -1.0, None
        for fname in sorted(os.listdir(watchlist_dir)):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(watchlist_dir, fname)
            try:
                known = DeepFace.represent(
                    img_path=path, model_name=MODEL, detector_backend="skip"
                )[0]["embedding"]
            except Exception:
                # A broken or multi-face image shouldn't abort the whole scan.
                continue
            a, b = np.array(probe), np.array(known)
            score = float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))
            if score > best_score:
                best_score, best_id = score, fname

        if best_id and best_score >= MATCH_THRESHOLD:
            result["match"] = best_id
            result["distance"] = round(best_score, 4)
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"[:200]

    print(json.dumps(result))


if __name__ == "__main__":
    main()
