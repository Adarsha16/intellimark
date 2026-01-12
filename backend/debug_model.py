
import sys
import os
import torch
import numpy as np
from datetime import datetime, timedelta

# Add app to path
sys.path.append(os.getcwd())

from app.services.success_predictor import simulate_market_dynamics, feature_extractor, model, MODEL_PATH
from app.services.ai_models import EventSuccessNet

def check_data_variance():
    print("\n--- Checking Synthetic Data Variance ---")
    scores = []
    for _ in range(50):
        days = np.random.randint(-5, 120)
        date = datetime.now() + timedelta(days=days)
        cap = np.random.randint(5, 500)
        evt = {
            "title": "Random Event",
            "description": "Desc",
            "date": date,
            "capacity": cap,
            "prize_pool": None
        }
        s = simulate_market_dynamics(evt)
        scores.append(s)
    
    print(f"Min Score: {min(scores):.4f}")
    print(f"Max Score: {max(scores):.4f}")
    print(f"Mean Score: {np.mean(scores):.4f}")
    print(f"Variance: {np.var(scores):.4f}")
    if np.var(scores) < 0.001:
        print("❌ ALARM: Generated data is flat!")
    else:
        print("✅ Data looks varied.")

def check_model_predictions():
    print("\n--- Checking Model Predictions ---")
    if os.path.exists(MODEL_PATH):
        try:
            model.load_state_dict(torch.load(MODEL_PATH))
            print("Model loaded.")
        except Exception as e:
            print(f"Failed to load model: {e}")
            return

    model.eval()
    
    test_cases = [
        {"desc": "Great Tech Event (Optimal)", "days": 40, "cap": 100, "title": "AI Summit", "prize": "$1000"},
        {"desc": "Bad Event (Too soon)", "days": 2, "cap": 100, "title": "Boring Meetup", "prize": None},
        {"desc": "Future Event (Too far)", "days": 200, "cap": 50, "title": "Future Talk", "prize": None},
    ]
    
    for case in test_cases:
        date = datetime.now() + timedelta(days=case['days'])
        evt = {
            "title": case['title'],
            "description": case['desc'],
            "date": date,
            "capacity": case['cap'],
            "prize_pool": case['prize']
        }
        
        # Ground Truth check
        gt = simulate_market_dynamics(evt)
        
        # Model check
        features = feature_extractor.extract_features(evt)
        tensor_in = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            pred = model(tensor_in).item()
            
        print(f"Case '{case['desc']}': GT={gt:.4f}, Model={pred:.4f}")

if __name__ == "__main__":
    check_data_variance()
    check_model_predictions()
