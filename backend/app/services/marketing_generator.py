import random
import json
import logging
import httpx
from typing import List
from app.schemas.marketing import MarketingPlan, SocialPost
from app.models.event import Event
from app.core.config import settings

logger = logging.getLogger(__name__)

async def generate_marketing_plan(event: Event) -> MarketingPlan:
    """
    Generates a creative marketing plan using Google's Gemini API.
    Fallbacks to heuristics if the API is unavailable.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("Gemini API Key missing. Using fallback generator.")
        return _generate_fallback_plan(event)

    # Prepare Prompt
    system_instruction = """
    You are an expert Marketing Tech AI. Generate a structured marketing plan for an event.
    Calculated 'Viral Potential': High.
    
    Output JSON ONLY with this structure:
    {
      "strategy": "Strategy Name",
      "target_audience": "Audience Description",
      "key_selling_points": ["Point 1", "Point 2", "Point 3"],
      "social_posts": [
        {"platform": "Twitter", "content": "Post text...", "hashtags": ["#tag1", "#tag2"]},
        {"platform": "LinkedIn", "content": "Post text...", "hashtags": ["#tag1"]},
        {"platform": "Instagram", "content": "Post text...", "hashtags": ["#tag1"]}
      ],
      "image_prompts": ["Prompt 1", "Prompt 2"]
    }
    """
    
    user_prompt = f"""
    Event: {event.title}
    Description: {event.description}
    Location: {event.location_name}
    Date: {event.date}
    Prize Pool: {event.prize_pool}
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}]}],
        "generationConfig": {
            "temperature": 0.9, # Higher creative variance
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            response.raise_for_status()
            data = response.json()
            
            # Extract JSON text
            text_content = data["candidates"][0]["content"]["parts"][0]["text"]
            plan_dict = json.loads(text_content)
            
            # Map to Pydantic Models
            posts = [SocialPost(**p) for p in plan_dict.get("social_posts", [])]
            
            return MarketingPlan(
                strategy=plan_dict.get("strategy", "AI Strategy"),
                target_audience=plan_dict.get("target_audience", "General"),
                key_selling_points=plan_dict.get("key_selling_points", []),
                social_posts=posts,
                image_prompts=plan_dict.get("image_prompts", [])
            )
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Gemini API HTTP Error: {e}")
        print(f"DEBUG GEMINI ERROR BODY: {e.response.text}")
        return _generate_fallback_plan(event)
    except Exception as e:
        logger.error(f"Gemini Marketing Generation failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return _generate_fallback_plan(event)

def _generate_fallback_plan(event: Event) -> MarketingPlan:
    """
    Robust fallback with randomized templates.
    """
    title = event.title or "Event"
    loc = event.location_name or "TBD"
    
    # Random Strategy Names
    strategies = ["Community-First Approach", "Viral Hype Cycle", "Exclusive Access", "Grassroots Growth"]
    strategy = random.choice(strategies)
    
    # Randomized Post Templates
    twitter_templates = [
        f"🚀 {title} is coming to {loc}! Don't miss out. #Event",
        f"Who is ready for {title}? It's going to be huge! 🔥 #Hype",
        f"Mark your calendars! {title} @ {loc}. See you there! 📅 #{title.replace(' ', '')}",
        f"Breaking: {title} tickets are moving fast! 🎟️ #FOMO"
    ]
    
    linkedin_templates = [
        f"We are proud to announce {title}, a premier gathering for professionals.",
        f"Networking opportunity: Join us at {title} in {loc}.",
        f"Excited to see everyone at {title}. Let's connect and grow together.",
        f"{title} represents a new chapter for our community. Read more below."
    ]
    
    posts = [
        SocialPost(platform="Twitter", content=random.choice(twitter_templates), hashtags=["#Event", "#Live"]),
        SocialPost(platform="LinkedIn", content=random.choice(linkedin_templates), hashtags=["#Networking"])
    ]
    
    return MarketingPlan(
        strategy=strategy,
        target_audience="General Enthusiasts & Professionals",
        key_selling_points=[f"Attend {title}", "Network with peers", "Exclusive content"],
        social_posts=posts,
        image_prompts=[f"Poster for {title} in vivid colors"]
    )

async def optimize_event_metadata(event: Event) -> dict:
    """
    Uses AI to rewrite the event title and description for maximum impact.
    Returns: {"title": str, "description": str}
    """
    if not settings.GEMINI_API_KEY:
        return {
            "title": f"✨ {event.title}",
            "description": f"Join us for {event.title}! {event.description}"
        }

    api_key = settings.GEMINI_API_KEY
    current_title = event.title
    current_desc = event.description
    
    system_instruction = """
    You are an Expert Event Copywriter. Your goal is to maximize attendance.
    1.  Rewrite the Title to be punchy, exciting, and short (under 50 chars).
    2.  Rewrite the Description to be engaging, highlighting value, and action-oriented (100-200 words).
    3.  Return raw JSON: {"title": "...", "description": "..."}
    """
    
    user_prompt = f"""
    Current Title: {current_title}
    Current Description: {current_desc}
    Location: {event.location_name}
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json"
        }
    }

    import asyncio
    
    max_retries = 3
    base_delay = 1
    
    for attempt in range(max_retries):
        try:
            # DEBUG: Check what Key/Url is actually being used
            masked_key = f"{api_key[:5]}...{api_key[-5:]}" if api_key else "None"
            print(f"DEBUG: Optimization Attempt {attempt+1}. Key: {masked_key}, Model: gemini-3-flash-preview")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                
                if response.status_code == 429:
                    # Rate limit - wait and retry
                    wait_time = base_delay * (2 ** attempt)
                    print(f"Gemini Rate Limit (429). Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                    
                if response.status_code != 200:
                    print(f"Gemini API Error (Attempt {attempt+1}): {response.status_code} - {response.text}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1)
                        continue
                    response.raise_for_status()
                    
                data = response.json()
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                result = json.loads(text_content)
                
                return {
                    "title": result.get("title", current_title),
                    "description": result.get("description", current_desc)
                }
                
        except Exception as e:
            print(f"Optimization Exception (Attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            logger.error(f"Optimization failed after retries: {e}")
            
    # Fallback after all retries fail
    return {
        "title": f"✨ {current_title}",
        "description": current_desc
    }
