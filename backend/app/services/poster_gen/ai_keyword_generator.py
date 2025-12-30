"""
ai_keyword_generator.py

Uses Claude AI to generate event-specific visual keywords for SDXL poster generation.
Place this file alongside generate_base_sdxl.py
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def generate_visual_keywords_with_ai(event_prompt: str) -> str:
    import os
    import urllib.request
    import urllib.error

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set; using fallback keywords.")
        return get_fallback_keywords(event_prompt)

    system_prompt = """You are an expert at analyzing events and generating visual keywords for AI image generation.

Your task: Read the event details and generate SPECIFIC visual keywords that will help create a relevant, eye-catching poster background.

Rules:
1. Focus on VISUAL elements (colors, objects, atmosphere, style)
2. Be specific to the event type (e.g., "valorant agents with abilities" not just "gaming")
3. Include 5-10 keywords/phrases
4. Avoid text/typography - focus on imagery
5. Use descriptive, vivid language
6. Return ONLY the keywords as a comma-separated string
"""

    user_message = f"""Event details:
{event_prompt}

Generate visual keywords for this event's poster background:"""

    request_data = {
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 200,
        "messages": [
            {"role": "user", "content": f"{system_prompt}\n\n{user_message}"}
        ],
    }

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(request_data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))

        # Anthropic responses usually look like: {"content":[{"type":"text","text":"..."}], ...}
        if isinstance(result, dict) and "content" in result and result["content"]:
            keywords = result["content"][0].get("text", "").strip()
            if keywords:
                logger.info(f"AI generated keywords: {keywords}")
                return keywords

        logger.warning("No usable content in AI response; using fallback.")
        return get_fallback_keywords(event_prompt)

    except urllib.error.HTTPError as e:
        # Read body for debugging (may include message)
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        logger.error(f"Anthropic API HTTPError {e.code}: {e.reason}. {body[:200]}")
        return get_fallback_keywords(event_prompt)

    except urllib.error.URLError as e:
        logger.error(f"Network error calling AI API: {e}")
        return get_fallback_keywords(event_prompt)

    except Exception as e:
        logger.error(f"AI keyword generation failed: {e}")
        return get_fallback_keywords(event_prompt)



def get_fallback_keywords(event_prompt: str) -> str:
    """
    Fallback keyword generator using simple pattern matching.
    Used when AI API fails.
    """
    prompt_lower = event_prompt.lower()
    
    keyword_patterns = {

        # =========================
        # GAMING / ESPORTS
        # =========================
        "valorant": (
            "valorant tactical agents, neon red and cyan lighting, futuristic weapons, "
            "radianite energy effects, cyberpunk combat arena, dramatic esports lighting"
        ),
        "csgo": (
            "counter-strike tactical operators, realistic weapons, urban combat zones, "
            "green and orange accents, competitive esports atmosphere"
        ),
        "counter strike": (
            "tactical shooter environment, realistic military gear, smoke grenades, "
            "urban maps, competitive lighting"
        ),
        "league of legends": (
            "league champions, summoner's rift environment, magical abilities, "
            "fantasy energy effects, blue and gold color palette"
        ),
        "dota": (
            "dota heroes, ancient battlefield, mystical abilities, "
            "dark fantasy lighting, epic magical effects"
        ),
        "fortnite": (
            "fortnite battle royale island, building structures, vibrant cartoon colors, "
            "storm effects, dynamic action"
        ),
        "pubg": (
            "battle royale combat zone, military gear, realistic terrain, "
            "smoke and explosion effects, cinematic lighting"
        ),
        "apex": (
            "apex legends characters, futuristic arena, sci-fi abilities, "
            "dynamic motion blur, high energy combat visuals"
        ),
        "gaming": (
            "gaming setup environment, RGB lighting, neon accents, "
            "esports arena, high contrast futuristic aesthetic"
        ),
        "esports": (
            "esports tournament stage, massive LED screens, "
            "stadium lighting, competitive crowd atmosphere"
        ),

        # =========================
        # TECH / AI / ENGINEERING
        # =========================
        "tech": (
            "futuristic technology visuals, glowing circuit boards, "
            "holographic interfaces, blue and cyan lighting, sleek modern design"
        ),
        "ai": (
            "artificial intelligence visuals, neural network patterns, "
            "data streams, blue purple gradients, futuristic computation"
        ),
        "machine learning": (
            "abstract neural networks, flowing data pipelines, "
            "algorithmic visuals, modern AI aesthetic"
        ),
        "blockchain": (
            "digital blockchain networks, glowing nodes, "
            "cryptographic patterns, futuristic finance visuals"
        ),
        "cybersecurity": (
            "cyber security interface, digital locks, glowing shields, "
            "matrix-style data streams, dark tech aesthetic"
        ),
        "robotics": (
            "robotic systems, mechanical arms, futuristic labs, "
            "industrial automation visuals, clean sci-fi lighting"
        ),
        "hackathon": (
            "coding environment, multiple monitors, glowing code screens, "
            "collaborative workspace, innovation-focused tech aesthetic"
        ),

        # =========================
        # BUSINESS / CORPORATE
        # =========================
        "business": (
            "modern corporate environment, professional lighting, "
            "blue and grey tones, clean geometric composition"
        ),
        "conference": (
            "conference hall interior, presentation screens, "
            "professional networking atmosphere, modern architecture"
        ),
        "startup": (
            "startup workspace, modern office design, "
            "innovation-driven environment, clean tech aesthetic"
        ),
        "entrepreneurship": (
            "business growth visuals, upward motion, "
            "modern professional atmosphere, success-oriented design"
        ),
        "finance": (
            "financial data visualizations, stock market graphs, "
            "dark blue tones, professional corporate lighting"
        ),
        "marketing": (
            "digital marketing visuals, social media icons abstraction, "
            "bright modern colors, creative business aesthetic"
        ),

        # =========================
        # MUSIC / ENTERTAINMENT
        # =========================
        "music": (
            "concert stage lighting, colorful spotlights, "
            "sound wave visualizations, energetic festival atmosphere"
        ),
        "concert": (
            "live concert stage, dramatic lighting beams, "
            "crowd silhouettes, vibrant performance energy"
        ),
        "dj": (
            "dj stage setup, neon lights, electronic music vibe, "
            "dynamic motion lighting"
        ),
        "festival": (
            "outdoor festival atmosphere, colorful lights, "
            "crowd energy, celebratory visuals"
        ),
        "dance": (
            "dynamic dance motion, colorful lighting, "
            "energetic movement, expressive atmosphere"
        ),

        # =========================
        # SPORTS / FITNESS
        # =========================
        "sports": (
            "athletic silhouettes in motion, stadium lighting, "
            "dynamic action visuals, high energy atmosphere"
        ),
        "football": (
            "football stadium, dramatic floodlights, "
            "athletes in motion, competitive sports energy"
        ),
        "basketball": (
            "basketball court lighting, dynamic jump shots, "
            "arena atmosphere, bold sports visuals"
        ),
        "cricket": (
            "cricket stadium, pitch lighting, "
            "athletic motion, professional sports atmosphere"
        ),
        "marathon": (
            "runners in motion, urban race environment, "
            "sunrise lighting, endurance sports aesthetic"
        ),
        "fitness": (
            "fitness training visuals, muscular silhouettes, "
            "high contrast lighting, motivational energy"
        ),

        # =========================
        # ART / CULTURE / EDUCATION
        # =========================
        "art": (
            "abstract artistic patterns, creative brushstrokes, "
            "gallery lighting, modern art aesthetic"
        ),
        "exhibition": (
            "art gallery space, clean white lighting, "
            "minimalist artistic composition"
        ),
        "workshop": (
            "hands-on learning environment, creative workspace, "
            "tools and materials, collaborative atmosphere"
        ),
        "education": (
            "modern learning environment, knowledge growth visuals, "
            "clean academic aesthetic"
        ),
        "seminar": (
            "educational seminar hall, professional lighting, "
            "focused learning atmosphere"
        ),

        # =========================
        # SOCIAL / COMMUNITY
        # =========================
        "community": (
            "diverse group silhouettes, warm lighting, "
            "inclusive atmosphere, positive social energy"
        ),
        "networking": (
            "professional networking visuals, abstract human connections, "
            "clean modern environment"
        ),
        "charity": (
            "uplifting atmosphere, warm color palette, "
            "hopeful community-focused visuals"
        ),

        # =========================
        # DEFAULT
        # =========================
        "default": (
            "modern event poster background, smooth gradients, "
            "abstract shapes, professional lighting, premium digital art"
        ),
    }

    
    # Find matching patterns
    for pattern, keywords in keyword_patterns.items():
        if pattern in prompt_lower:
            logger.info(f"Using fallback keywords for '{pattern}'")
            return keywords
    
    # Default fallback
    logger.info("Using default fallback keywords")
    return "dynamic event aesthetic, energetic atmosphere, modern design, vibrant colors, professional quality"


def test_keyword_generator():
    """Test the keyword generator with sample events."""
    test_events = [
        """Title: Valorant Champions 2024
Subtitle: Winter Invitational
Date: December 20-22, 2024
Location: Tokyo Game Arena""",
        
        """Title: AI & Machine Learning Summit
Date: March 15, 2025
Theme: Future of AI
Location: San Francisco Convention Center""",
        
        """Title: Summer Music Festival
Date: July 4-6, 2025
Theme: Electronic Dance Music
Location: Desert Oasis""",
    ]
    
    print("Testing AI Keyword Generator\n" + "="*50)
    
    for i, event in enumerate(test_events, 1):
        print(f"\nTest {i}:")
        print(f"Event: {event[:50]}...")
        keywords = generate_visual_keywords_with_ai(event)
        print(f"Keywords: {keywords}")
        print("-"*50)


if __name__ == "__main__":
    # Run tests
    test_keyword_generator()