import torch
import psutil
import threading
import time

class MemoryMonitor:
    def __init__(self, warning_threshold=0.8, critical_threshold=0.9):
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.monitoring = False
        self.monitor_thread = None
        
    def start_monitoring(self):
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
    def stop_monitoring(self):
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
            
    def _monitor_loop(self):
        while self.monitoring:
            self._check_memory()
            time.sleep(5)  # Check every 5 seconds
            
    def _check_memory(self):
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
                    print(f"⚠️ CRITICAL: GPU memory usage at {gpu_percent:.1%}")
                    torch.cuda.empty_cache()
                elif gpu_percent > self.warning_threshold:
                    print(f"⚠️ WARNING: GPU memory usage at {gpu_percent:.1%}")
            except Exception as e:
                print(f"Error checking GPU memory: {e}")
                
        if cpu_percent > self.critical_threshold:
            print(f"⚠️ CRITICAL: CPU memory usage at {cpu_percent:.1%}")
        elif cpu_percent > self.warning_threshold:
            print(f"⚠️ WARNING: CPU memory usage at {cpu_percent:.1%}") 