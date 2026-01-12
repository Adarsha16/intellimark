from pydantic import BaseModel
from typing import List


class SuccessMetric(BaseModel):
    """Individual success metric with score and explanation."""
    name: str
    score: int  # 0-100
    explanation: str


class SuccessPrediction(BaseModel):
    """Complete success prediction for an event."""
    overall_score: int  # 0-100
    risk_level: str  # "Low", "Medium", "High"
    predicted_attendance: str
    revenue_potential: str
    metrics: List[SuccessMetric]
    recommendations: List[str]
    strengths: List[str]
    warnings: List[str]
