---
title: CrowdKavach Backend
emoji: 🛡️
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# CrowdKavach Backend API

Real-time crowd monitoring backend with YOLO-based people detection.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cameras` | GET | List all cameras |
| `/stream-with-boxes` | GET | MJPEG stream with bounding boxes |
| `/analytics/global` | GET | Global analytics data |
| `/analytics/all` | GET | Per-camera analytics |
| `/coordinates` | GET | People coordinates for a camera |
| `/api/alert/emergency` | POST | Trigger emergency alert |

## Environment Variables

- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token

## Usage

This backend is designed to work with the CrowdKavach Next.js frontend.

Set `NEXT_PUBLIC_PYTHON_SERVER_URL` in your frontend to point to this Space's URL.
