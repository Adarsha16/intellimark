from pydantic import BaseModel
from typing import List, Optional

class SocialPost(BaseModel):
    platform: str
    content: str
    hashtags: List[str]

class MarketingPlan(BaseModel):
    strategy: str
    target_audience: str
    key_selling_points: List[str]
    social_posts: List[SocialPost]
    image_prompts: Optional[List[str]] = None
