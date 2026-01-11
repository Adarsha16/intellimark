import os
import time
import logging

logger = logging.getLogger(__name__)

class SystemFileLock:
    def __init__(self, lock_name="generation.lock", timeout=120, on_wait=None):
        self.lock_dir = os.path.join(os.getcwd(), "static", "locks")
        self.lock_file = os.path.join(self.lock_dir, lock_name)
        self.timeout = timeout
        self.on_wait = on_wait
        os.makedirs(self.lock_dir, exist_ok=True)

    def acquire(self):
        start_time = time.time()
        while True:
            try:
                # Exclusive creation - atomic on Windows/Linux
                fd = os.open(self.lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                logger.info(f"🔒 Lock acquired: {self.lock_file}")
                return True
            except FileExistsError:
                # Check for stale lock
                if self._is_stale():
                    logger.warning("🗑️ Removing stale lock...")
                    self.release()
                    continue
                
                # Timeout
                if time.time() - start_time > self.timeout:
                    raise TimeoutError("Could not acquire generation lock.")
                
                if self.on_wait:
                    self.on_wait()
                    
                time.sleep(1) # Wait and retry

    def release(self):
        try:
            if os.path.exists(self.lock_file):
                os.remove(self.lock_file)
                logger.info(f"🔓 Lock released: {self.lock_file}")
        except Exception as e:
            logger.error(f"Error releasing lock: {e}")

    def _is_stale(self):
        try:
            # Simple timestamp check (if file older than timeout + buffer)
            mtime = os.path.getmtime(self.lock_file)
            if time.time() - mtime > self.timeout:
                return True
        except:
            return False
        return False

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
