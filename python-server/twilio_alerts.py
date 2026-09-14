"""
Twilio WhatsApp Alert Module for TRINETRA

This module handles sending WhatsApp alerts via Twilio API.
For prototype/demo purposes, alerts are logged but not actually sent
unless explicitly configured with valid Twilio credentials.

Setup Instructions (Free Twilio Account):
1. Go to https://www.twilio.com/try-twilio and create a free account
2. Verify your phone number
3. Go to Console > Messaging > Try it out > Send a WhatsApp message
4. Follow the sandbox setup (send "join <sandbox-code>" to +1 415 523 8886)
5. Copy your Account SID and Auth Token from the Console Dashboard
6. Configure in TRINETRA Settings page
"""

import os
import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Alert configuration file path
ALERT_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "alert_config.json")
ALERT_HISTORY_FILE = os.path.join(os.path.dirname(__file__), "alert_history.json")


class AlertConfig(BaseModel):
    """Configuration for alert system"""
    whatsappEnabled: bool = False
    whatsappNumber: str = ""  # User's WhatsApp number to receive alerts
    alertCooldownMinutes: int = 5  # Prevent spam
    twilioAccountSid: str = ""
    twilioAuthToken: str = ""
    twilioWhatsappNumber: str = "whatsapp:+14155238886"  # Twilio sandbox default
    prototypeMode: bool = True  # When True, logs alerts but doesn't send
    emergencyContacts: List[Dict[str, str]] = []  # Display only, not contacted


class AlertRecord(BaseModel):
    """Record of an alert that was sent"""
    id: str
    type: str  # "overcrowding" | "no_entry_violation" | "emergency" | "system_error"
    zone: str
    camera_id: str
    people_count: int
    max_capacity: int
    timestamp: str
    whatsapp_sent: bool
    acknowledged: bool = False
    hash: str = ""
    previous_hash: str = ""


# Global state
alert_config: AlertConfig = AlertConfig()
alert_history: List[AlertRecord] = []
last_alert_times: Dict[str, datetime] = {}  # zone_id -> last alert time


def load_alert_config():
    """Load alert configuration from JSON file"""
    global alert_config
    try:
        if os.path.exists(ALERT_CONFIG_FILE):
            with open(ALERT_CONFIG_FILE, 'r') as f:
                data = json.load(f)
                alert_config = AlertConfig(**data)
                logger.info("Alert configuration loaded successfully")
    except Exception as e:
        logger.error(f"Error loading alert config: {e}")
        alert_config = AlertConfig()


def save_alert_config():
    """Save alert configuration to JSON file"""
    try:
        with open(ALERT_CONFIG_FILE, 'w') as f:
            json.dump(alert_config.model_dump(), f, indent=2)
        logger.info("Alert configuration saved successfully")
    except Exception as e:
        logger.error(f"Error saving alert config: {e}")


def load_alert_history():
    """Load alert history from JSON file"""
    global alert_history
    try:
        if os.path.exists(ALERT_HISTORY_FILE):
            with open(ALERT_HISTORY_FILE, 'r') as f:
                data = json.load(f)
                alert_history = [AlertRecord(**record) for record in data]
    except Exception as e:
        logger.error(f"Error loading alert history: {e}")
        alert_history = []


def save_alert_history():
    """Save alert history to JSON file"""
    try:
        # Keep only last 100 alerts
        recent_alerts = alert_history[-100:]
        with open(ALERT_HISTORY_FILE, 'w') as f:
            json.dump([record.model_dump() for record in recent_alerts], f, indent=2)
    except Exception as e:
        logger.error(f"Error saving alert history: {e}")


def can_send_alert(zone: str) -> bool:
    """Check if we can send an alert for this zone (cooldown check)"""
    if zone not in last_alert_times:
        return True
    
    time_since_last = datetime.now() - last_alert_times[zone]
    cooldown = timedelta(minutes=alert_config.alertCooldownMinutes)
    return time_since_last >= cooldown


def format_alert_message(
    alert_type: str,
    zone: str,
    people_count: int,
    max_capacity: int,
    reason: Optional[str] = None
) -> str:
    """Format the WhatsApp alert message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if alert_type == "overcrowding":
        occupancy_pct = int((people_count/max_capacity)*100) if max_capacity > 0 else 0
        risk_level = "🔴 CRITICAL" if occupancy_pct >= 100 else "🟠 HIGH" if occupancy_pct >= 85 else "🟡 MODERATE"
        mishap_warning = ""
        if occupancy_pct >= 100:
            mishap_warning = "\n\n⚠️ *MISHAP PREDICTION: STAMPEDE RISK HIGH*\n_Crowd crush conditions detected. Immediate evacuation or crowd dispersion required._"
        elif occupancy_pct >= 85:
            mishap_warning = "\n\n⚠️ *MISHAP PREDICTION: ELEVATED RISK*\n_High density may lead to crowd surge. Deploy crowd control._"
        
        return (
            f"🚨 *TRINETRA ALERT*\n\n"
            f"⚠️ *OVERCROWDING DETECTED*\n\n"
            f"📍 Zone: {zone}\n"
            f"👥 People Count: {people_count}\n"
            f"📊 Max Capacity: {max_capacity}\n"
            f"📈 Occupancy: {occupancy_pct}%\n"
            f"🎯 Risk Level: {risk_level}\n\n"
            f"🕐 Time: {timestamp}"
            f"{mishap_warning}\n\n"
            f"_Immediate attention required. Consider crowd control measures._"
        )
    elif alert_type == "no_entry_violation":
        return (
            f"🚨 *TRINETRA ALERT*\n\n"
            f"🚫 *RESTRICTED ZONE BREACH*\n\n"
            f"📍 Zone: {zone}\n"
            f"👥 Unauthorized Entry: {people_count} person(s)\n"
            f"⛔ Zone Status: NO ENTRY\n\n"
            f"🕐 Time: {timestamp}\n\n"
            f"_Security personnel alerted. Immediate action required._"
        )
    elif alert_type == "emergency":
        return (
            f"🆘 *TRINETRA EMERGENCY*\n\n"
            f"🔴 *MANUAL EMERGENCY TRIGGERED*\n\n"
            f"📍 Location: {zone}\n"
            f"📝 Reason: {reason or 'Not specified'}\n\n"
            f"🕐 Time: {timestamp}\n\n"
            f"_All emergency protocols activated._"
        )
    else:  # system_error
        return (
            f"⚙️ *TRINETRA SYSTEM ALERT*\n\n"
            f"⚠️ *SYSTEM ERROR DETECTED*\n\n"
            f"📍 Affected Zone: {zone}\n"
            f"📝 Details: {reason or 'Unknown error'}\n\n"
            f"🕐 Time: {timestamp}\n\n"
            f"_Manual intervention may be required._"
        )


def send_whatsapp_alert(
    alert_type: str,
    zone: str,
    people_count: int = 0,
    max_capacity: int = 0,
    camera_id: str = "",
    reason: Optional[str] = None
) -> Dict:
    """
    Send WhatsApp alert via Twilio.
    In prototype mode, logs the alert but doesn't actually send.
    
    Returns:
        Dict with status and message
    """
    global alert_history, last_alert_times
    
    # Check cooldown (skip for emergencies)
    if alert_type != "emergency" and not can_send_alert(zone):
        return {
            "success": False,
            "reason": "cooldown",
            "message": f"Alert cooldown active for zone {zone}"
        }
    
    # Format the message
    message = format_alert_message(alert_type, zone, people_count, max_capacity, reason)
    
    # Blockchain Hashing Logic
    timestamp_iso = datetime.now().isoformat()
    previous_hash = alert_history[-1].hash if alert_history else "0" * 64
    
    alert_data_string = f"{alert_type}{zone}{camera_id}{people_count}{max_capacity}{timestamp_iso}{previous_hash}"
    new_hash = hashlib.sha256(alert_data_string.encode()).hexdigest()
    
    # Create alert record
    alert_record = AlertRecord(
        id=f"alert-{datetime.now().strftime('%Y%m%d%H%M%S')}-{zone.replace(' ', '-')}",
        type=alert_type,
        zone=zone,
        camera_id=camera_id,
        people_count=people_count,
        max_capacity=max_capacity,
        timestamp=timestamp_iso,
        whatsapp_sent=False,
        acknowledged=False,
        hash=new_hash,
        previous_hash=previous_hash
    )
    
    # Prototype mode - just log, don't send
    if alert_config.prototypeMode or not alert_config.whatsappEnabled:
        logger.info(f"[PROTOTYPE MODE] WhatsApp Alert would be sent:\n{message}")
        alert_record.whatsapp_sent = False
        alert_history.append(alert_record)
        last_alert_times[zone] = datetime.now()
        save_alert_history()
        
        return {
            "success": True,
            "prototype_mode": True,
            "message": "Alert logged (prototype mode - no actual message sent)",
            "alert_id": alert_record.id,
            "formatted_message": message
        }
    
    # Actual Twilio sending (when not in prototype mode)
    if not alert_config.twilioAccountSid or not alert_config.twilioAuthToken:
        return {
            "success": False,
            "reason": "config",
            "message": "Twilio credentials not configured"
        }
    
    if not alert_config.whatsappNumber:
        return {
            "success": False,
            "reason": "config",
            "message": "WhatsApp number not configured"
        }
    
    try:
        from twilio.rest import Client
        
        client = Client(alert_config.twilioAccountSid, alert_config.twilioAuthToken)
        
        # Format the recipient number
        to_number = alert_config.whatsappNumber
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"
        
        twilio_message = client.messages.create(
            body=message,
            from_=alert_config.twilioWhatsappNumber,
            to=to_number
        )
        
        logger.info(f"WhatsApp alert sent successfully: {twilio_message.sid}")
        alert_record.whatsapp_sent = True
        alert_history.append(alert_record)
        last_alert_times[zone] = datetime.now()
        save_alert_history()
        
        return {
            "success": True,
            "message_sid": twilio_message.sid,
            "alert_id": alert_record.id
        }
        
    except ImportError:
        logger.error("Twilio library not installed. Run: pip install twilio")
        return {
            "success": False,
            "reason": "dependency",
            "message": "Twilio library not installed"
        }
    except Exception as e:
        logger.error(f"Error sending WhatsApp alert: {e}")
        return {
            "success": False,
            "reason": "error",
            "message": str(e)
        }


def check_capacity_violation(
    zone: str,
    camera_id: str,
    people_count: int,
    max_capacity: int
) -> Optional[Dict]:
    """
    Check if there's a capacity violation and trigger alert if needed.
    
    Returns:
        Alert result if triggered, None otherwise
    """
    # No entry zone (capacity = 0)
    if max_capacity == 0 and people_count > 0:
        return send_whatsapp_alert(
            alert_type="no_entry_violation",
            zone=zone,
            people_count=people_count,
            max_capacity=max_capacity,
            camera_id=camera_id
        )
    
    # Overcrowding (count exceeds capacity)
    if max_capacity > 0 and people_count > max_capacity:
        return send_whatsapp_alert(
            alert_type="overcrowding",
            zone=zone,
            people_count=people_count,
            max_capacity=max_capacity,
            camera_id=camera_id
        )
    
    return None


def trigger_emergency_alert(zone: str, reason: str) -> Dict:
    """Trigger a manual emergency alert"""
    return send_whatsapp_alert(
        alert_type="emergency",
        zone=zone,
        reason=reason
    )


def get_alert_config() -> AlertConfig:
    """Get current alert configuration"""
    return alert_config


def update_alert_config(new_config: AlertConfig) -> AlertConfig:
    """Update alert configuration"""
    global alert_config
    alert_config = new_config
    save_alert_config()
    return alert_config


def get_alert_history(limit: int = 50) -> List[AlertRecord]:
    """Get recent alert history"""
    return alert_history[-limit:]


def acknowledge_alert(alert_id: str) -> bool:
    """Mark an alert as acknowledged"""
    for alert in alert_history:
        if alert.id == alert_id:
            alert.acknowledged = True
            save_alert_history()
            return True
    return False


# Load configuration on module import
load_alert_config()
load_alert_history()
