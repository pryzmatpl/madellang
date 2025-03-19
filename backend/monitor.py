#!/usr/bin/env python3
import os
import time
import psutil
import socket
import argparse
import logging
import json
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("monitor.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('system-monitor')

def check_system_health(backend_url="http://localhost:8000"):
    """Check the health of the system and backend services"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = {
        "timestamp": timestamp,
        "system": {},
        "backend": {"status": "unknown"}
    }
    
    # System metrics
    report["system"]["cpu_percent"] = psutil.cpu_percent(interval=1)
    report["system"]["memory_percent"] = psutil.virtual_memory().percent
    report["system"]["disk_percent"] = psutil.disk_usage('/').percent
    
    # Network connectivity
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        report["system"]["internet"] = "connected"
    except (socket.timeout, socket.error):
        report["system"]["internet"] = "disconnected"
    
    # Backend health check
    try:
        response = requests.get(f"{backend_url}/system-info", timeout=5)
        if response.status_code == 200:
            report["backend"]["status"] = "ok"
            report["backend"]["info"] = response.json()
        else:
            report["backend"]["status"] = f"error: {response.status_code}"
    except requests.exceptions.RequestException as e:
        report["backend"]["status"] = f"error: {str(e)}"
    
    return report

def monitor_loop(interval=60, backend_url="http://localhost:8000", 
                alert_threshold=90, log_file="health_log.json"):
    """
    Continuously monitor system health
    
    Args:
        interval: Check interval in seconds
        backend_url: URL to the backend service
        alert_threshold: Percentage threshold for alerts
        log_file: File to save health logs
    """
    logger.info(f"Starting system monitoring (interval: {interval}s)")
    
    while True:
        try:
            report = check_system_health(backend_url)
            
            # Log to file
            with open(log_file, "a") as f:
                f.write(json.dumps(report) + "\n")
            
            # Check for alerts
            alerts = []
            if report["system"]["cpu_percent"] > alert_threshold:
                alerts.append(f"CPU usage: {report['system']['cpu_percent']}%")
            
            if report["system"]["memory_percent"] > alert_threshold:
                alerts.append(f"Memory usage: {report['system']['memory_percent']}%")
            
            if report["system"]["disk_percent"] > alert_threshold:
                alerts.append(f"Disk usage: {report['system']['disk_percent']}%")
            
            if report["backend"]["status"] != "ok":
                alerts.append(f"Backend issue: {report['backend']['status']}")
            
            if alerts:
                logger.warning("⚠️ ALERTS: " + ", ".join(alerts))
            else:
                logger.info("✅ System healthy")
                
            time.sleep(interval)
            
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
            time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor system and service health")
    parser.add_argument("--interval", type=int, default=60, help="Check interval in seconds")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--threshold", type=int, default=90, help="Alert threshold percentage")
    parser.add_argument("--log", type=str, default="health_log.json", help="Log file path")
    
    args = parser.parse_args()
    monitor_loop(args.interval, args.url, args.threshold, args.log) 