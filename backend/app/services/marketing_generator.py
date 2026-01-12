import random
from typing import List
from app.schemas.marketing import MarketingPlan, SocialPost
from app.models.event import Event

def generate_marketing_plan(event: Event) -> MarketingPlan:
    """
    Generates a deterministic but tailored marketing plan based on event details.
    In a real-world scenario, this would call an LLM (e.g. Gemini/GPT).
    """
    
    # 1. Determine Event Type & Strategy
    title_lower = event.title.lower()
    desc_lower = (event.description or "").lower()
    
    strategy = "General Awareness"
    audience = "General Public"
    
    if "tech" in title_lower or "hackathon" in title_lower or "code" in title_lower:
        strategy = "Community Engagement & Developer Evangelism"
        audience = "Developers, Students, Tech Enthusiasts"
    elif "music" in title_lower or "concert" in title_lower or "party" in title_lower:
        strategy = "Hype Generation & Influencer Marketing"
        audience = "Music Lovers, Students, Youth"
    elif "workshop" in title_lower or "seminar" in title_lower:
        strategy = "Educational Value & Professional Growth"
        audience = "Professionals, Students, Lifelong Learners"
    
    # 2. Key Selling Points
    points = [
        f"Experience {event.title} live at {event.location_name}",
        "Connect with like-minded individuals",
        "Don't miss out on this unique opportunity"
    ]
    if event.prize_pool:
        points.append(f"Win a share of {event.prize_pool}!")
    
    # 3. Generate Social Posts
    posts = []
    
    # Twitter
    twitter_tags = ["#Event", "#Buzz"]
    if "tech" in title_lower: twitter_tags = ["#Tech", "#Coding", "#Innovation"]
    posts.append(SocialPost(
        platform="Twitter",
        content=f"🚀 Get ready for {event.title}! Join us at {event.location_name} for an unforgettable experience. {event.description[:50]}... 👇",
        hashtags=twitter_tags
    ))
    
    # LinkedIn
    posts.append(SocialPost(
        platform="LinkedIn",
        content=f"We are excited to announce {event.title}. This event aims to {strategy.lower()}. Join us at {event.location_name} to network and learn.",
        hashtags=["#Professional", "#Networking", "#Growth"]
    ))
    
    # Instagram
    posts.append(SocialPost(
        platform="Instagram",
        content=f"✨ {event.title.upper()} IS HERE! ✨\n\n📍 {event.location_name}\n📅 {event.date}\n\nTag your friends who need to be here! 🔥",
        hashtags=["#InstaGood", "#EventLife", "#MustGo"]
    ))
    
    return MarketingPlan(
        strategy=strategy,
        target_audience=audience,
        key_selling_points=points,
        social_posts=posts,
        image_prompts=[
            f"A vibrant digital art poster for {event.title}, neon style, 4k",
            f"Minimalist background for {event.title} featuring {strategy} themes"
        ]
    )
