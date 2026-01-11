import json
import os
import time
from typing import Dict, Any

PROGRESS_DIR = os.path.join(os.getcwd(), "static", "progress")
os.makedirs(PROGRESS_DIR, exist_ok=True)

class ProgressTracker:
    @staticmethod
    def _get_path(event_id: int) -> str:
        return os.path.join(PROGRESS_DIR, f"{event_id}.json")

    @classmethod
    def set_progress(cls, event_id: int, progress: int, message: str):
        try:
            path = cls._get_path(event_id)
            data = {
                "progress": progress, 
                "message": message,
                "timestamp": time.time()
            }
            with open(path, "w") as f:
                json.dump(data, f)
            print(f"[ProgressTracker] Event {event_id}: {progress}% - {message}")
        except Exception as e:
            print(f"Failed to write progress: {e}")

    @classmethod
    def get_progress(cls, event_id: int) -> Dict[str, Any]:
        try:
            path = cls._get_path(event_id)
            if not os.path.exists(path):
                return {"progress": 0, "message": "Idle"}
            
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Failed to read progress: {e}")
            return {"progress": 0, "message": "Error reading status"}

    @classmethod
    def clear(cls, event_id: int):
        try:
            path = cls._get_path(event_id)
            if os.path.exists(path):
                os.remove(path)
        except:
            pass
