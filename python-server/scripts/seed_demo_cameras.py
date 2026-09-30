"""Point TRINETRA at the bundled sample clips instead of real cameras.

Run once (or any time) to write cameras.json:
    python scripts/seed_demo_cameras.py

The server treats a local .mp4 exactly like an IP camera and loops it at EOF,
so the whole detection pipeline runs with no hardware attached.
"""
import json
import os
import sys

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEMO_CAMERAS = [
    {
        "id": "cam-gate-1",
        "name": "Fence Line Alpha",
        "url": "samples/people-detection.mp4",
        "zone": "Sector A",
        "enabled": True,
        "area": 1200,
        "areaUnit": "sqm",
        "densityLevel": "medium",
        "capacity": 3,
    },
    {
        "id": "cam-perim-2",
        "name": "Observation Post Bravo",
        "url": "samples/car-detection.mp4",
        "zone": "Sector B",
        "enabled": True,
        "area": 2400,
        "areaUnit": "sqm",
        "densityLevel": "low",
        "capacity": 6,
    },
    {
        "id": "cam-check-3",
        "name": "Check Post Charlie",
        "url": "samples/face-demographics-walking.mp4",
        "zone": "Sector C",
        "enabled": True,
        "area": 800,
        "areaUnit": "sqm",
        "densityLevel": "high",
        "capacity": 2,
    },
]


def main():
    missing = [c["url"] for c in DEMO_CAMERAS
               if not os.path.exists(os.path.join(SERVER_DIR, c["url"]))]
    if missing:
        print("Missing sample clips:", ", ".join(missing))
        print("Download them into python-server/samples/ first.")
        return 1

    out = os.path.join(SERVER_DIR, "cameras.json")
    with open(out, "w") as f:
        json.dump({"cameras": DEMO_CAMERAS}, f, indent=4)

    print(f"Wrote {len(DEMO_CAMERAS)} demo cameras to {out}")
    print("Start the server with: python main.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
