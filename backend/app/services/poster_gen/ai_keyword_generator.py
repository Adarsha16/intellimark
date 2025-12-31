"""
ai_keyword_generator.py

Uses Google Gemini (Flash 2.5) to generate a highly descriptive
poster background prompt for image generation (SDXL / Stable Diffusion).
"""

import json
import logging
import urllib.request
import urllib.error

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_visual_prompt_with_ai(event_prompt: str) -> str:
    """
    Generates a detailed, descriptive poster background prompt
    using Google Gemini.

    Output is optimized for image generation models (SDXL).
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("GEMINI_API_KEY not set; using fallback prompt.")
        return get_fallback_prompt(event_prompt)

    url = (
        "https://generativelanguage.googleapis.com/v1/"
        f"models/gemini-2.5-flash:generateContent?key={api_key}"
    )

    system_instruction = """
    You are an expert AI image prompt engineer specializing in event posters.

    Task:
    Generate ONE highly descriptive visual background prompt suitable for
    professional AI image generation (SDXL / Stable Diffusion).

    STRICT RULES:
    - Describe ONLY the background visuals (no text, no typography).
    - Focus on environment, lighting, color palette, atmosphere, mood, composition.
    - Use cinematic, high-quality descriptive language.
    - No bullet points, no lists.
    - Do NOT mention words like "poster", "text", "title", or "logo".
    - Output must be ONE paragraph, 40–80 words.
    - Do NOT explain anything.
    """

    full_prompt = (
        f"{system_instruction}\n\n"
        f"Event Description:\n{event_prompt}\n\n"
        "Generated Visual Prompt:"
    )

    request_data = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 200,
        },
    }

    try:
        req = urllib.request.Request(
            url=url,
            data=json.dumps(request_data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=12) as response:
            result = json.loads(response.read().decode("utf-8"))

        candidates = result.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
                prompt = parts[0]["text"].strip()
                prompt = " ".join(prompt.split())  # normalize spacing

                if len(prompt.split()) >= 15:
                    logger.info("🎨 Gemini Visual Prompt Generated")
                    return prompt

        logger.warning("Gemini returned weak prompt; using fallback.")
        return get_fallback_prompt(event_prompt)

    except urllib.error.HTTPError as e:
        logger.error(f"Gemini API Error {e.code}: {e.reason}")
        return get_fallback_prompt(event_prompt)
    except Exception as e:
        logger.error(f"AI Prompt Generation Failed: {e}")
        return get_fallback_prompt(event_prompt)


def get_fallback_prompt(event_prompt: str) -> str:
    """
    High-quality fallback prompts mapped to common event types.
    """
    p = event_prompt.lower()

    fallback_map = {
        # --- ESPORTS & GAMING ---
        "clash": (
            "A vibrant fantasy battlefield environment with colorful medieval elements, "
            "towering castle structures in the distance, dynamic lighting, soft clouds of "
            "dust and magic particles in the air, rich saturated colors, energetic and playful "
            "atmosphere, high detail, cinematic wide angle"
        ),
        "gaming": (
            "A futuristic esports arena filled with glowing RGB lighting, neon accents, "
            "massive digital screens, dramatic spotlights cutting through atmospheric haze, "
            "crowd silhouettes, high contrast, cyberpunk inspired, ultra detailed"
        ),
        # --- TECH ---
        "hackathon": (
            "A dark futuristic tech environment with glowing green data streams, floating "
            "holographic interfaces, multiple monitors illuminating the scene, cyberpunk city "
            "elements, moody lighting, high detail, cinematic perspective"
        ),
        "ai": (
            "An abstract futuristic environment featuring glowing neural networks, flowing "
            "blue data streams, soft volumetric lighting, advanced technology aesthetics, "
            "clean and modern atmosphere, ultra detailed, sci-fi inspired"
        ),
        # --- MUSIC ---
        "concert": (
            "A large concert stage environment with dramatic lighting beams, colorful lasers, "
            "smoke-filled atmosphere, energetic crowd silhouettes, vibrant colors, dynamic "
            "composition, high contrast, cinematic live performance feel"
        ),
        # --- BUSINESS ---
        "business": (
            "A modern professional environment with sleek glass architecture, soft ambient "
            "lighting, abstract geometric shapes, cool blue and white color palette, clean "
            "minimalist design, premium corporate atmosphere"
        ),
    }

    for key, value in fallback_map.items():
        if key in p:
            logger.info(f"Using fallback prompt for: {key}")
            return value

    logger.info("Using generic fallback prompt.")
    return (
        "A modern abstract environment with smooth gradient lighting, soft shadows, "
        "clean geometric forms, balanced composition, professional and premium atmosphere, "
        "high detail, cinematic quality"
    )


if __name__ == "__main__":
    print("Testing Descriptive Poster Prompt Generation...\n")
    test_prompt = "Clash Royale Tournament. Mobile esports battle."
    print("Event:", test_prompt)
    print("\nGenerated Prompt:\n")
    print(generate_visual_prompt_with_ai(test_prompt))
