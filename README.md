<div align="center">
  <img src="public/android-chrome-512x512.png" width="120" alt="TRINETRA Logo" />
  <h1>TRINETRA // IBVAP</h1>
  <p><strong>Intelligent Video Analytics Platform for Border Surveillance</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Category-Software-06b6d4?style=for-the-badge" alt="Software" />
    <img src="https://img.shields.io/badge/Theme-Cybersecurity_&_Blockchain-ff5258?style=for-the-badge" alt="Cybersecurity" />
    <img src="https://img.shields.io/badge/Build-Prototype_Ready-10b981?style=for-the-badge" alt="Prototype Ready" />
  </p>
</div>

## 📖 Background

Border security forces deploy CCTV cameras at Border Out Posts (BOPs), check posts, border roads, and other strategic locations for surveillance and monitoring. However, conventional CCTV systems primarily provide video recording and live monitoring capabilities, requiring continuous human observation. 

Advanced surveillance functionalities such as Facial Recognition Systems (FRS), Automatic Number Plate Recognition (ANPR), intrusion detection, and object tracking often require specialized hardware and proprietary solutions, making large-scale deployment costly and difficult, particularly in remote border areas.

## 🎯 The Solution

**TRINETRA** is an AI-driven software platform capable of transforming existing CCTV infrastructure into an intelligent surveillance network without requiring dedicated FRS, ANPR, or smart-camera hardware. 

The platform ingests live video streams from standard IP-based CCTV cameras (or DroidCam streams) and performs real-time video analytics using Artificial Intelligence and Computer Vision techniques at the Edge.

### Core Capabilities
- 👤 **Human Detection & Tracking**: Real-time identification and persistent tracking utilizing YOLOv8.
- 🚙 **Vehicle Detection & Classification**: Differentiate between civilian, military, and transport vehicles.
- 🎭 **Face Watchlist Matching**: Asynchronous **DeepFace** (FaceNet) biometric facial extraction that compares detected human faces against a local database using Cosine Similarity vectors to identify known suspects.
- 🔢 **ANPR Hotlist System**: Asynchronous **EasyOCR** neural network extracts vehicle registration plates from bounding boxes and flags stolen/wanted vehicles instantly.
- 🚧 **Virtual Fence Intrusion Detection**: Draw digital boundaries that trigger critical alerts upon breach.
- 🌙 **Night-Time Vision Enhancement**: Automatically applies Contrast Limited Adaptive Histogram Equalization (CLAHE) during night hours to extract detail from low-light conditions.
- 📱 **Real-Time Alerts & Event Logging**: Instant tactical alerts pushed to the Command Center HUD and dispatched to commanders via the **Twilio WhatsApp API**.

---

## 🔒 The "X-Factor" Features

To ensure maximum security and reliability in harsh border environments, TRINETRA includes three standout features:

1. **Blockchain Immutable Audit Logs (Cybersecurity Theme)**
   All critical alerts (Intrusions, ANPR hits, Watchlist Matches) are cryptographically hashed using SHA-256 and chained to previous events. This ensures that logs cannot be tampered with, deleted, or altered by corrupt insiders, creating a verifiable and immutable audit trail.

2. **Edge-to-Cloud Architecture (Zero-Internet Capability)**
   BOPs often have poor internet connectivity. TRINETRA processes the heavy AI video analytics (YOLO, DeepFace, EasyOCR) locally at the Edge (using JSON flat-files and local image assets) and only transmits lightweight metadata to the central Supabase PostgreSQL cluster when a connection is available.

3. **Military-Grade Tactical UI**
   A specialized dark-mode Command Center dashboard utilizing cyan/red color coding. It replaces civilian terminology (like "crowd capacity") with tactical Border Security threat-assessment logic (e.g. "Restricted Zone Breaches"), reducing eye strain for night-shift operators while highlighting high-priority threats immediately.

---

## 🧠 System Architecture

`mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#0a0d14',
    'primaryBorderColor': '#06b6d4',
    'primaryTextColor': '#ffffff',
    'lineColor': '#06b6d4',
    'clusterBkg': 'transparent',
    'clusterBorder': '#06b6d4'
  }
}}%%
graph TD
    subgraph "Border Out Post (Edge Node)"
        CCTV["CCTV / IP Camera Streams"] --> |Video Frames| EdgeProcessing["Python FastAPI Edge Server"]
        
        subgraph "AI Video Analytics Pipeline"
            EdgeProcessing --> YOLO["YOLOv8 Detection"]
            EdgeProcessing --> FRS["DeepFace Biometric Extraction"]
            EdgeProcessing --> ANPR["EasyOCR Plate Reading"]
            
            YOLO --> Track["Virtual Fence Logic"]
            FRS --> Watchlist["Local Watchlist Matching"]
            ANPR --> Hotlist["Vehicle Hotlist Verification"]
        end
        
        Track --> AlertGen["Alert Engine"]
        Watchlist --> AlertGen
        Hotlist --> AlertGen
    end

    subgraph "Cybersecurity & Blockchain Layer"
        AlertGen --> HashEngine["SHA-256 Cryptographic Hashing"]
        HashEngine --> ImmutableLog[("Immutable Audit Ledger")]
    end

    subgraph "Central Command (Cloud / HQ)"
        Auth["Supabase Authentication"] -.-> |JWT Route Protection| Frontend["Next.js Command Center"]
        Frontend <--> |REST API| EdgeProcessing
        ImmutableLog --> |Tamper-Proof Logs| Frontend
        AlertGen --> |Twilio WhatsApp API| QRT["Quick Reaction Team (SOS)"]
    end
`

## 🔄 User & Data Flow

`mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'actorBkg': '#0a0d14',
    'actorBorder': '#06b6d4',
    'actorTextColor': '#ffffff',
    'signalColor': '#06b6d4',
    'signalTextColor': '#ffffff',
    'noteBkg': '#06b6d4',
    'noteTextColor': '#000000',
    'noteBorderColor': '#06b6d4',
    'activationBorderColor': '#06b6d4',
    'activationBkgColor': '#06b6d4'
  }
}}%%
sequenceDiagram
    participant Commander as Base Commander
    participant Auth as Supabase Auth
    participant UI as Next.js Dashboard
    participant Edge as Edge AI Node
    participant CCTV as Border Camera

    Commander->>Auth: Secure Login (Email/Password)
    Auth-->>Commander: Issue AES-256 JWT Session
    Commander->>UI: Access TRINETRA Command Post
    
    UI->>Edge: Initialize Camera Grid
    Edge->>CCTV: Connect via IP/RTSP
    CCTV-->>Edge: Raw Video Feed
    
    Note over Edge: Run YOLOv8, FaceNet & EasyOCR
    Edge-->>UI: Stream MJPEG with Tactical Overlays
    
    Note over CCTV,Edge: Threat Detected (e.g. Watchlist Match)
    Edge->>Edge: Generate SHA-256 Immutable Incident Hash
    Edge->>UI: Push Priority Alert to HUD
    
    UI-->>Commander: Trigger Visual Red Alert & Twilio WhatsApp
    Commander->>UI: Acknowledge Threat & Deploy QRT
`

---

## 🛠️ Technical Architecture & Stack

### Edge AI Analytics (Backend)
- **Core Engine:** Python 3.13, FastAPI, Uvicorn
- **Computer Vision:** Ultralytics YOLOv8 (Tracking & Detection), OpenCV, PyTorch
- **OCR Engine:** EasyOCR (Asynchronous Plate Extraction)
- **Face Recognition:** DeepFace (FaceNet Biometric Embeddings)
- **Communication:** Twilio Python SDK (WhatsApp/SMS Alerts)

### Command Center (Frontend)
- **Framework:** Next.js 14 (App Router), React 18
- **Styling:** Tailwind CSS (Custom Military Tactical Theme)
- **Icons & UI:** Lucide React, Radix UI primitives

### Cybersecurity & Blockchain (Hackathon Theme)
- **Authentication:** Supabase Auth (Email/Password)
- **Route Protection:** Next.js Edge Middleware with JWT verification
- **Data Security:** AES-256 encrypted session cookies and environment-level isolation
- **Blockchain Ledger:** Cryptographic SHA-256 Hash Chaining for immutable audit trails.

---

## 🚀 Setup & Installation

### 1. Edge AI Node (Python Backend)
Ensure you have Python 3.13+ installed.

`ash
cd python-server
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate # Linux/Mac
pip install -r requirements.txt
python main.py
`
*(Note: The first time main.py detects a face, it will pause for ~60 seconds to download the DeepFace FaceNet weights. This only happens once).*

### 2. Twilio WhatsApp Configuration (Optional but recommended)
To receive actual WhatsApp alerts on your phone, create a .env.local file in the root directory and add:
`
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=your_twilio_number
TWILIO_TO_NUMBER=your_personal_number
`

### 3. Central Command (Next.js Frontend)
Ensure you have Node.js 18+ installed.

`ash
npm install
npm run dev
`
The Command Center will be available at http://localhost:3000.

---
