import torch
import torch.nn as nn
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import logging

# Configure logger
logger = logging.getLogger(__name__)

class EventSuccessNet(nn.Module):
    """
    Standard Feed-Forward Neural Network for predicting event success.
    Simplified architecture for better convergence on synthetic data.
    """
    def __init__(self, input_dim: int = 6, hidden_dim: int = 128):
        super(EventSuccessNet, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc3 = nn.Linear(hidden_dim // 2, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        out = self.relu(out)
        out = self.fc3(out)
        return self.sigmoid(out)

class FeatureExtractor:
    """
    Handles data preprocessing and feature engineering for the Neural Network.
    """
    def __init__(self):
        try:
            from sentence_transformers import SentenceTransformer
            # Load small, efficient model for embeddings
            self.text_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.has_model = True
        except ImportError:
            logger.warning("sentence-transformers not installed. Using dummy embeddings.")
            self.has_model = False
            self.text_model = None
        except Exception as e:
            logger.warning(f"Failed to load SentenceTransformer: {e}")
            self.has_model = False
            self.text_model = None

    def extract_features(self, event_data: Dict[str, Any]) -> np.ndarray:
        """
        Converts raw event dictionary into a single feature vector.
        """
        # 1. Numerical Features
        # Date logic
        event_date = event_data.get('date')
        # 1. Days until (Normalize: 0-365 -> -1 to 1 approx)
        if isinstance(event_data.get('date'), str):
            d = datetime.fromisoformat(event_data['date'])
        else:
            d = event_data.get('date') or datetime.now()
            
        days = (d - datetime.now(d.tzinfo)).days
        # Sigmoid-ish compression for days: 0->0, 30->0.5, 90->0.8 (Roughly)
        norm_days = np.tanh(days / 60.0) 
        
        # 2. Capacity (Log scale 0 to 1)
        cap = event_data.get('capacity', 0)
        norm_cap = np.log1p(cap) / 8.0 # log(2000) ~= 7.6
        
        # 3. Categorical (Weekend)
        is_weekend = 1.0 if d.weekday() >= 5 else 0.0
        
        # 4. Binary (Prize)
        has_prize = 1.0 if event_data.get('prize_pool') else 0.0
        
        # 5. Text Lengths (Log scale)
        t_len = np.log1p(len(event_data.get('title', ''))) / 5.0
        d_len = np.log1p(len(event_data.get('description', ''))) / 7.0
        
        numerical_features = np.array([norm_days, norm_cap, is_weekend, has_prize, t_len, d_len], dtype=np.float32)

        # 2. Text Embeddings (IGNORED for stability optimization - reduced noise)
        # return np.concatenate([numerical_features, text_embedding])
        return numerical_features

    def batch_extract(self, events: List[Dict[str, Any]]) -> torch.Tensor:
        """Process a batch of events"""
        features_list = [self.extract_features(e) for e in events]
        return torch.tensor(np.array(features_list), dtype=torch.float32)
