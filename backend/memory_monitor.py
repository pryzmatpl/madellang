import torch
import psutil
import threading
import time
import logging

logger = logging.getLogger(__name__)

class MemoryMonitor:
    def __init__(self, warning_threshold=0.8, critical_threshold=0.9):
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.monitoring = False
        self.monitor_thread = None
        
    def start_monitoring(self):
        """Start the background memory monitoring thread"""
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        logger.info("Memory monitoring started")
        
    def stop_monitoring(self):
        """Stop the background memory monitoring thread"""
        if self.monitoring:
            self.monitoring = False
            if self.monitor_thread:
                self.monitor_thread.join(timeout=1)
            logger.info("Memory monitoring stopped")
            
    def _monitor_loop(self):
        """Background thread that periodically checks memory usage"""
        while self.monitoring:
            self._check_memory()
            time.sleep(5)  # Check every 5 seconds
            
    def _check_memory(self):
        """Check CPU and GPU memory usage and log warnings if thresholds exceeded"""
        # CPU memory
        cpu_percent = psutil.virtual_memory().percent / 100.0
        
        # GPU memory if available
        if torch.cuda.is_available():
            try:
                allocated = torch.cuda.memory_allocated(0)
                reserved = torch.cuda.memory_reserved(0)
                total = torch.cuda.get_device_properties(0).total_memory
                gpu_percent = allocated / total
                
                if gpu_percent > self.critical_threshold:
                    logger.warning(f"CRITICAL: GPU memory usage at {gpu_percent:.1%}")
                    # Try to free some memory
                    torch.cuda.empty_cache()
                elif gpu_percent > self.warning_threshold:
                    logger.info(f"WARNING: GPU memory usage at {gpu_percent:.1%}")
            except Exception as e:
                logger.error(f"Error checking GPU memory: {e}")
                
        if cpu_percent > self.critical_threshold:
            logger.warning(f"CRITICAL: CPU memory usage at {cpu_percent:.1%}")
        elif cpu_percent > self.warning_threshold:
            logger.info(f"WARNING: CPU memory usage at {cpu_percent:.1%}") 