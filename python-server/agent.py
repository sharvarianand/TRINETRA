import os
import time
import json
import asyncio
import requests
from threading import Thread

# A simple in-memory store for alerts to demonstrate the AI Agent without complex DB setup
global_alerts_store = []
global_incident_reports = []

def run_watch_commander():
    print("Watch Commander AI Agent initialized and running in background.")
    api_key = os.getenv("NEXT_PUBLIC_OPENROUTER_API_KEY", "")
    
    while True:
        time.sleep(30) # Run every 30 seconds for the hackathon (normally every 5-10 mins)
        
        if len(global_alerts_store) < 2:
            continue
            
        print("Watch Commander AI analyzing recent alerts...")
        
        # Grab the latest 10 alerts
        recent_alerts = global_alerts_store[-10:]
        alert_text = "\n".join([f"[{a['timestamp']}] {a['type']} at {a['zone']} (Camera: {a['camera_id']})" for a in recent_alerts])
        
        system_prompt = """You are the TRINETRA Autonomous Watch Commander Agent. 
Your job is to analyze the recent raw security alerts and synthesize a 2-3 sentence Tactical Incident Report if you see a coordinated threat. 
If it's just random noise, reply with 'NO_THREAT'.
Be extremely professional and use military terminology."""

        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000"
                },
                json={
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Recent Alerts:\n{alert_text}\n\nDraft a report:"}
                    ]
                }
            )
            
            result = response.json()
            report_content = result['choices'][0]['message']['content'].strip()
            
            if report_content and "NO_THREAT" not in report_content:
                print(f"🔥 Watch Commander identified a threat: {report_content}")
                report = {
                    "id": f"REP-{int(time.time())}",
                    "title": "Automated Tactical Synthesis",
                    "description": report_content,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "severity": "high"
                }
                global_incident_reports.append(report)
                
                # Clear alerts so we don't duplicate reports
                global_alerts_store.clear()
                
        except Exception as e:
            print(f"Watch Commander Error: {e}")

def start_agent():
    thread = Thread(target=run_watch_commander, daemon=True)
    thread.start()
