"""
AI Event Success Predictor Service
Analyzes event details and predicts success metrics with recommendations.
"""
from app.models.event import Event
from app.schemas.prediction import SuccessPrediction, SuccessMetric
from datetime import datetime, timedelta


def predict_event_success(event: Event) -> SuccessPrediction:
    """
    Analyze an event and predict its success based on multiple factors.
    Returns a comprehensive prediction with metrics and recommendations.
    """
    metrics = []
    recommendations = []
    strengths = []
    warnings = []
    
    title_lower = event.title.lower() if event.title else ""
    desc_lower = event.description.lower() if event.description else ""
    combined = title_lower + " " + desc_lower
    
    # 1. Title Quality Score
    title_score = 50
    if len(event.title or "") > 10:
        title_score += 15
    if any(word in title_lower for word in ["hackathon", "summit", "conference", "festival", "workshop"]):
        title_score += 20
    if any(word in title_lower for word in ["ai", "tech", "innovation", "startup"]):
        title_score += 15
    title_score = min(100, title_score)
    
    metrics.append(SuccessMetric(
        name="Title Appeal",
        score=title_score,
        explanation="How compelling and searchable your event title is"
    ))
    
    # 2. Description Quality Score
    desc_score = 30
    desc_len = len(event.description or "")
    if desc_len > 50:
        desc_score += 20
    if desc_len > 150:
        desc_score += 20
    if any(word in desc_lower for word in ["learn", "network", "exclusive", "free", "prize"]):
        desc_score += 15
    if "!" in (event.description or ""):
        desc_score += 5
    desc_score = min(100, desc_score)
    
    metrics.append(SuccessMetric(
        name="Description Quality",
        score=desc_score,
        explanation="How well your description sells the event"
    ))
    
    # 3. Timing Score
    timing_score = 50
    if event.date:
        event_date = event.date if isinstance(event.date, datetime) else datetime.fromisoformat(str(event.date))
        # Ensure event_date is offset-aware or naive to match now()
        now = datetime.now(event_date.tzinfo) if event_date.tzinfo else datetime.now()
        days_until = (event_date - now).days
        
        if 14 <= days_until <= 60:
            timing_score = 90
            strengths.append("Optimal planning window (2-8 weeks)")
        elif 7 <= days_until < 14:
            timing_score = 70
            warnings.append("Less than 2 weeks - plan promotions now")
        elif days_until < 7:
            timing_score = 40
            warnings.append("Very short notice - urgent action needed")
        elif days_until > 90:
            timing_score = 60
            recommendations.append("Event is far out - start awareness campaigns early")
        
        # Weekend bonus
        if event_date.weekday() >= 5:
            timing_score += 10
            strengths.append("Weekend timing typically sees higher attendance")
    
    timing_score = min(100, timing_score)
    metrics.append(SuccessMetric(
        name="Timing",
        score=timing_score,
        explanation="Event date optimization and planning window"
    ))
    
    # 4. Capacity & Scale Score
    capacity_score = 60
    capacity = event.capacity or 0
    if 20 <= capacity <= 100:
        capacity_score = 85
        strengths.append("Manageable capacity for quality engagement")
    elif 100 < capacity <= 500:
        capacity_score = 75
    elif capacity > 500:
        capacity_score = 65
        recommendations.append("Large events need strong marketing - consider EventPulse AI")
    elif capacity < 20:
        capacity_score = 50
        recommendations.append("Small capacity limits reach - consider hybrid format")
    
    metrics.append(SuccessMetric(
        name="Scale Optimization",
        score=capacity_score,
        explanation="Capacity vs. engagement potential"
    ))
    
    # 5. Incentive Score
    incentive_score = 40
    if event.prize_pool:
        prize_lower = event.prize_pool.lower()
        if any(char.isdigit() for char in prize_lower):
            incentive_score = 85
            strengths.append(f"Prize pool ({event.prize_pool}) attracts participants")
        else:
            incentive_score = 70
    else:
        recommendations.append("Consider adding prizes or giveaways to boost attendance")
    
    if any(word in combined for word in ["free", "complimentary", "no cost"]):
        incentive_score += 15
        strengths.append("Free entry removes attendance barriers")
    
    incentive_score = min(100, incentive_score)
    metrics.append(SuccessMetric(
        name="Incentives",
        score=incentive_score,
        explanation="Prizes, freebies, and value proposition"
    ))
    
    # 6. Organizer Credibility
    org_score = 50
    if event.organizer_name:
        org_score = 75
        strengths.append(f"Named organizer ({event.organizer_name}) builds trust")
    else:
        recommendations.append("Add organizer name to increase credibility")
    
    metrics.append(SuccessMetric(
        name="Organizer Trust",
        score=org_score,
        explanation="Credibility and brand recognition"
    ))
    
    # Calculate Overall Score
    weights = [0.15, 0.15, 0.20, 0.15, 0.20, 0.15]
    scores = [m.score for m in metrics]
    overall_score = int(sum(s * w for s, w in zip(scores, weights)))
    
    # Determine Risk Level
    if overall_score >= 75:
        risk_level = "Low"
    elif overall_score >= 55:
        risk_level = "Medium"
    else:
        risk_level = "High"
    
    # Predict Attendance
    if overall_score >= 80:
        predicted_attendance = f"80-95% of {capacity}" if capacity else "High turnout expected"
    elif overall_score >= 60:
        predicted_attendance = f"60-80% of {capacity}" if capacity else "Good turnout expected"
    else:
        predicted_attendance = f"40-60% of {capacity}" if capacity else "Moderate turnout expected"
    
    # Revenue Potential
    if overall_score >= 75 and event.prize_pool:
        revenue_potential = "High - Strong sponsorship appeal"
    elif overall_score >= 60:
        revenue_potential = "Moderate - Good for partnerships"
    else:
        revenue_potential = "Growing - Focus on audience building"
    
    # Add generic recommendations if needed
    if not recommendations:
        recommendations.append("Your event is well-optimized! Consider A/B testing marketing messages.")
    
    if not strengths:
        strengths.append("You've set up the basics - keep adding details!")
    
    return SuccessPrediction(
        overall_score=overall_score,
        risk_level=risk_level,
        predicted_attendance=predicted_attendance,
        revenue_potential=revenue_potential,
        metrics=metrics,
        recommendations=recommendations[:5],  # Limit to top 5
        strengths=strengths[:5],
        warnings=warnings[:3]
    )
