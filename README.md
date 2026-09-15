<div align="center">
  <img src="./app/icon.svg" width="120" alt="TRINETRA Logo" />
</div>

# TRINETRA 🛡️
**Intelligent Border Video Analytics Platform**

*Developed for the Ministry of Home Affairs, Sashastra Seema Bal (SSB), Police II Division.*

**Category:** Software | **Theme:** Blockchain & Cybersecurity

---

## 📖 Background

Border security forces deploy CCTV cameras at Border Out Posts (BOPs), check posts, border roads, and other strategic locations for surveillance and monitoring. However, conventional CCTV systems primarily provide video recording and live monitoring capabilities, requiring continuous human observation. 

Advanced surveillance functionalities such as Facial Recognition Systems (FRS), Automatic Number Plate Recognition (ANPR), intrusion detection, and object tracking often require specialized hardware and proprietary solutions, making large-scale deployment costly and difficult, particularly in remote border areas.

## 🎯 The Solution

**TRINETRA** is an AI-driven software platform capable of transforming existing CCTV infrastructure into an intelligent surveillance network without requiring dedicated FRS, ANPR, or smart-camera hardware. 

The platform ingests live video streams from standard IP-based CCTV cameras and performs real-time video analytics using Artificial Intelligence and Computer Vision techniques at the Edge.

### Core Capabilities
- 🧍 **Human Detection & Tracking**: Real-time identification and persistent tracking across frames.
- 🚙 **Vehicle Detection & Classification**: Differentiate between civilian, military, and transport vehicles.
- 🆔 **Face Watchlist Matching**: Compares detected faces against a local database using histogram correlations to identify known suspects.
- 🔢 **ANPR Hotlist System**: Extracts vehicle registration plates and flags stolen/wanted vehicles instantly.
- 🚧 **Virtual Fence Intrusion Detection**: Draw digital boundaries that trigger alerts upon breach.
- 🕵️ **Loitering & Suspicious Activity**: Tracks object dwell-time and triggers alerts if subjects remain in restricted areas for >15 seconds.
- 🌙 **Night-Time Vision Enhancement**: Automatically applies CLAHE (Contrast Limited Adaptive Histogram Equalization) during night hours for low-light conditions.
- 🚨 **Real-Time Alerts & Event Logging**: Instant tactical alerts pushed to the Command Center via WebSocket and WhatsApp.

---

## 🌟 The "X-Factor" Features

To ensure maximum security and reliability in harsh border environments, TRINETRA includes three standout features:

1. **Blockchain Immutable Audit Logs (Cybersecurity Theme)**
   All critical alerts (Intrusions, ANPR hits, Watchlist Matches) are cryptographically hashed using SHA-256 and chained to previous events. This ensures that logs cannot be tampered with, deleted, or altered by corrupt insiders, creating a verifiable and immutable audit trail.

2. **Edge-to-Cloud Architecture (Zero-Internet Capability)**
   BOPs often have poor internet connectivity. TRINETRA processes the heavy AI video analytics locally at the Edge (using JSON flat-files and local image assets) and only transmits lightweight metadata to the central Supabase PostgreSQL cluster when a connection is available.

3. **Military-Grade Tactical UI**
   A specialized dark-mode Command Center dashboard utilizing cyan/red color coding, reducing eye strain for night-shift operators while highlighting high-priority threats immediately.

---

## 🛠️ Tech Stack

- **Command Center (Frontend)**: Next.js 14, React, TailwindCSS
- **AI Analytics Engine (Backend)**: FastAPI, Python, YOLOv8, OpenCV, EasyOCR
- **Authentication**: Supabase Auth (Secure JWT)
- **Database**: Supabase PostgreSQL (Cloud) / Local JSON (Edge)

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase Project API Keys

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Setup Python AI Backend
```bash
cd python-server
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
pip install supabase
```

### 4. Run the Platform
Open two terminals.

**Terminal 1 (Command Center):**
```bash
npm run dev
```

**Terminal 2 (AI Engine):**
```bash
cd python-server
python -m uvicorn yolo_bounding_boxes:app --host 0.0.0.0 --port 8000
```

Access the Command Center at `http://localhost:3000`

