---
title: TRINETRA AI Edge Backend
emoji: 🛡️
colorFrom: cyan
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# TRINETRA Backend API

Real-time Tactical Border Surveillance AI backend using YOLOv8, DeepFace, and EasyOCR.

## Environment Variables required in Hugging Face:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_NUMBER
- TWILIO_TO_NUMBER

## Usage
Deploy this Space using Docker. Once deployed, take the Hugging Face App URL and set it as your NEXT_PUBLIC_PYTHON_SERVER_URL in your Vercel Frontend environment variables!
