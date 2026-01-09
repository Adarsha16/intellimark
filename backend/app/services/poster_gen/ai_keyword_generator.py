import json
import logging
import time
import random
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
import urllib.request
import urllib.error
from urllib.parse import urlencode
import ssl

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelVersion(str, Enum):
    """Supported Gemini model versions."""

    FLASH_2_5 = "gemini-2.5-flash"
    FLASH_1_5 = "gemini-1.5-flash"
    PRO = "gemini-1.5-pro"


@dataclass
class GenerationConfig:
    """Configuration for AI generation."""

    temperature: float = 0.7
    max_output_tokens: int = 200
    top_p: float = 0.95
    top_k: int = 40


@dataclass
class PromptResult:
    """Structured result of prompt generation."""

    success: bool
    prompt: str
    model_used: str
    generation_time_ms: float
    error: Optional[str] = None
    fallback_used: bool = False


class AIPromptGenerator:
    """
    Production-ready AI prompt generator with retry logic, monitoring, and fallback strategies.
    Thread-safe and configurable for different environments.
    """

    # Model priority list (fallback if primary fails)
    MODEL_PRIORITY = [ModelVersion.FLASH_2_5, ModelVersion.FLASH_1_5, ModelVersion.PRO]

    # Default generation configuration
    DEFAULT_CONFIG = GenerationConfig()

    # System instruction template
    SYSTEM_INSTRUCTION = """
    You are an expert AI image prompt engineer specializing in event posters.
    Task: Generate ONE highly descriptive visual background prompt for SDXL/Stable Diffusion.
    
    STRICT RULES:
    - Describe ONLY the background visuals (no text, no typography).
    - Focus on lighting, color palette, atmosphere, mood, composition.
    - Use cinematic, high-quality descriptive language.
    - Output must be ONE paragraph, 40-80 words.
    - Do NOT mention words like "poster", "text", "title", or "logo".
    - Avoid describing people or faces unless specifically requested.
    - Ensure the prompt is self-contained and doesn't reference the event description.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the prompt generator.

        Args:
            api_key: Gemini API key (uses settings.GEMINI_API_KEY if None)
        """
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.timeout = (
            settings.AI_REQUEST_TIMEOUT
            if hasattr(settings, "AI_REQUEST_TIMEOUT")
            else 15
        )
        self.max_retries = (
            settings.AI_MAX_RETRIES if hasattr(settings, "AI_MAX_RETRIES") else 3
        )
        self.retry_delay = (
            settings.AI_RETRY_DELAY if hasattr(settings, "AI_RETRY_DELAY") else 1.0
        )

        # Create a custom SSL context for better security
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = True
        self.ssl_context.verify_mode = ssl.CERT_REQUIRED

        # Statistics for monitoring
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "fallback_used": 0,
            "total_generation_time_ms": 0,
        }

    def generate_visual_prompt(self, event_prompt: str) -> PromptResult:
        """
        Generate a detailed visual background prompt.

        Args:
            event_prompt: Description of the event

        Returns:
            PromptResult object with generation details
        """
        start_time = time.time()
        self.stats["total_requests"] += 1

        # Validate input
        if not event_prompt or not event_prompt.strip():
            logger.warning("Empty event prompt provided")
            fallback = self._get_fallback_prompt("generic event")
            return PromptResult(
                success=False,
                prompt=fallback,
                model_used="fallback",
                generation_time_ms=time.time() - start_time,
                error="Empty event prompt",
                fallback_used=True,
            )

        # Check API key
        if not self.api_key:
            logger.error("GEMINI_API_KEY not configured")
            fallback = self._get_fallback_prompt(event_prompt)
            self.stats["fallback_used"] += 1
            return PromptResult(
                success=False,
                prompt=fallback,
                model_used="fallback",
                generation_time_ms=time.time() - start_time,
                error="API key not configured",
                fallback_used=True,
            )

        # Clean and truncate input for safety
        clean_prompt = event_prompt.strip()[:2000]  # Limit input length

        # Try primary model first, then fallbacks
        result = None
        for model_version in self.MODEL_PRIORITY:
            result = self._try_generate_with_model(model_version, clean_prompt)
            if result.success:
                self.stats["successful_requests"] += 1
                break

        # If all models fail, use fallback
        if not result or not result.success:
            self.stats["failed_requests"] += 1
            self.stats["fallback_used"] += 1
            fallback = self._get_fallback_prompt(clean_prompt)
            result = PromptResult(
                success=False,
                prompt=fallback,
                model_used="fallback",
                generation_time_ms=time.time() - start_time,
                error="All models failed",
                fallback_used=True,
            )

        # Update statistics
        generation_time_ms = (time.time() - start_time) * 1000
        self.stats["total_generation_time_ms"] += generation_time_ms

        # Log metrics
        self._log_generation_metrics(result, generation_time_ms)

        return result

    def _try_generate_with_model(
        self, model_version: ModelVersion, event_prompt: str
    ) -> PromptResult:
        """
        Attempt to generate prompt with a specific model.

        Args:
            model_version: Which model to use
            event_prompt: Cleaned event description

        Returns:
            PromptResult with generation outcome
        """
        for attempt in range(self.max_retries):
            try:
                prompt = self._call_gemini_api(model_version, event_prompt, attempt)
                if prompt and len(prompt) > 20:
                    return PromptResult(
                        success=True,
                        prompt=prompt,
                        model_used=model_version.value,
                        generation_time_ms=0,  # Will be filled by parent
                        error=None,
                        fallback_used=False,
                    )
            except Exception as e:
                logger.warning(
                    f"Attempt {attempt + 1} failed for model {model_version.value}: {str(e)[:100]}"
                )

                # Exponential backoff with jitter
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2**attempt) + random.uniform(0, 0.1)
                    time.sleep(delay)

        return PromptResult(
            success=False,
            prompt="",
            model_used=model_version.value,
            generation_time_ms=0,
            error="All retries exhausted",
        )

    def _call_gemini_api(
        self, model_version: ModelVersion, event_prompt: str, attempt: int
    ) -> str:
        """
        Make actual API call to Gemini.

        Args:
            model_version: Model to use
            event_prompt: Event description
            attempt: Retry attempt number (for logging)

        Returns:
            Generated prompt string

        Raises:
            Exception: If API call fails
        """
        url = f"{self.base_url}/models/{model_version.value}:generateContent"
        params = {"key": self.api_key}
        full_url = f"{url}?{urlencode(params)}"

        request_data = {
            "contents": [{"parts": [{"text": event_prompt}]}],
            "system_instruction": {"parts": [{"text": self.SYSTEM_INSTRUCTION}]},
            "generationConfig": {
                "temperature": self.DEFAULT_CONFIG.temperature,
                "maxOutputTokens": self.DEFAULT_CONFIG.max_output_tokens,
                "topP": self.DEFAULT_CONFIG.top_p,
                "topK": self.DEFAULT_CONFIG.top_k,
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        }

        req = urllib.request.Request(
            url=full_url,
            data=json.dumps(request_data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": f"EventPosterGenerator/1.0 (Attempt: {attempt + 1})",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(
                req, timeout=self.timeout, context=self.ssl_context
            ) as response:
                if response.status != 200:
                    raise urllib.error.HTTPError(
                        url=full_url,
                        code=response.status,
                        msg=f"HTTP {response.status}",
                        hdrs=response.headers,
                        fp=None,
                    )

                result = json.loads(response.read().decode("utf-8"))

                # Check for safety blocks
                if result.get("promptFeedback", {}).get("blockReason"):
                    block_reason = result["promptFeedback"]["blockReason"]
                    raise ValueError(
                        f"Content blocked by safety filters: {block_reason}"
                    )

                candidates = result.get("candidates", [])
                if not candidates:
                    raise ValueError("No candidates returned from API")

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    raise ValueError("No content parts in response")

                prompt_text = parts[0].get("text", "").strip()
                if not prompt_text:
                    raise ValueError("Empty prompt returned")

                # Clean and validate the prompt
                cleaned_prompt = self._clean_prompt(prompt_text)
                return cleaned_prompt

        except urllib.error.HTTPError as e:
            logger.error(
                f"HTTP error {e.code} for model {model_version.value}: {e.reason}"
            )
            raise
        except urllib.error.URLError as e:
            logger.error(f"URL error for model {model_version.value}: {e.reason}")
            raise
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(
                f"Response parsing error for model {model_version.value}: {str(e)}"
            )
            raise

    def _clean_prompt(self, prompt: str) -> str:
        """
        Clean and normalize the generated prompt.

        Args:
            prompt: Raw prompt from AI

        Returns:
            Cleaned prompt
        """
        # Remove excessive whitespace
        cleaned = " ".join(prompt.split())

        # Remove common AI artifacts
        artifacts = [
            "Here is a visual prompt:",
            "Visual prompt:",
            "Background prompt:",
            "Prompt:",
            "Generated prompt:",
            "Image prompt:",
        ]

        for artifact in artifacts:
            if cleaned.startswith(artifact):
                cleaned = cleaned[len(artifact) :].strip()

        # Ensure it starts with a capital letter
        if cleaned and cleaned[0].islower():
            cleaned = cleaned[0].upper() + cleaned[1:]

        return cleaned

    def _get_fallback_prompt(self, event_prompt: str) -> str:
        """
        Get a fallback prompt based on event keywords.

        Args:
            event_prompt: Event description

        Returns:
            Fallback prompt
        """
        p = event_prompt.lower()

        # Predefined fallback prompts with weights
        fallbacks = [
            # Gaming/Esports
            (
                [
                    "clash",
                    "royale",
                    "gaming",
                    "esport",
                    "valorant",
                    "fortnite",
                    "overwatch",
                ],
                "A vibrant fantasy battlefield with medieval castle elements, dynamic lighting, "
                "soft dust clouds, rich saturated colors, energetic atmosphere, cinematic wide angle",
            ),
            # Tech/AI
            (
                [
                    "tech",
                    "hackathon",
                    "ai",
                    "machine learning",
                    "programming",
                    "coding",
                ],
                "A dark futuristic tech environment with glowing green data streams, "
                "floating holographic interfaces, moody lighting, cinematic perspective",
            ),
            # Music/Concerts
            (
                ["music", "concert", "festival", "dj", "band", "performance"],
                "A large concert stage environment with dramatic lighting beams, "
                "colorful lasers, smoke-filled atmosphere, vibrant colors, dynamic composition",
            ),
            # Nature/Environment
            (
                ["nature", "eco", "environment", "sustainability", "green", "outdoor"],
                "Lush botanical garden environment, sunlight filtering through leaves, "
                "organic textures, soft green palette, high detail nature photography",
            ),
            # Business/Conference
            (
                [
                    "business",
                    "conference",
                    "seminar",
                    "workshop",
                    "meeting",
                    "corporate",
                ],
                "Modern minimalist architecture with clean lines, soft ambient lighting, "
                "geometric shapes, neutral color palette, professional atmosphere",
            ),
            # Art/Creative
            (
                ["art", "creative", "design", "painting", "exhibition", "gallery"],
                "Abstract artistic environment with flowing colors, organic shapes, "
                "creative chaos, imaginative lighting, surreal atmosphere",
            ),
        ]

        for keywords, prompt in fallbacks:
            if any(keyword in p for keyword in keywords):
                return prompt

        # Default fallback
        return (
            "A modern abstract environment with smooth gradient lighting, "
            "soft shadows, clean geometric forms, professional premium atmosphere, high detail"
        )

    def _log_generation_metrics(self, result: PromptResult, generation_time_ms: float):
        """
        Log generation metrics for monitoring.

        Args:
            result: Prompt generation result
            generation_time_ms: Time taken in milliseconds
        """
        log_data = {
            "success": result.success,
            "model": result.model_used,
            "time_ms": round(generation_time_ms, 2),
            "fallback": result.fallback_used,
            "prompt_length": len(result.prompt),
            "error": result.error,
        }

        if result.success:
            logger.info("🎨 AI prompt generated", extra={"metrics": log_data})
        else:
            logger.warning(
                "AI prompt generation failed, using fallback",
                extra={"metrics": log_data},
            )

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get current statistics for monitoring.

        Returns:
            Dictionary of statistics
        """
        stats_copy = self.stats.copy()
        if stats_copy["total_requests"] > 0:
            stats_copy["success_rate"] = (
                stats_copy["successful_requests"] / stats_copy["total_requests"]
            ) * 100
            stats_copy["avg_generation_time_ms"] = (
                stats_copy["total_generation_time_ms"] / stats_copy["total_requests"]
            )
        else:
            stats_copy["success_rate"] = 0
            stats_copy["avg_generation_time_ms"] = 0

        return stats_copy

    def reset_statistics(self):
        """Reset statistics counters."""
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "fallback_used": 0,
            "total_generation_time_ms": 0,
        }


# Singleton instance for easy use
_generator_instance = None


def get_generator() -> AIPromptGenerator:
    """
    Get or create the singleton generator instance.

    Returns:
        AIPromptGenerator instance
    """
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = AIPromptGenerator()
    return _generator_instance


def generate_visual_prompt_with_ai(event_prompt: str) -> str:
    """
    Legacy compatibility function.
    Generates a detailed, descriptive poster background prompt using Google Gemini.

    Args:
        event_prompt: Event description

    Returns:
        Generated visual prompt string
    """
    generator = get_generator()
    result = generator.generate_visual_prompt(event_prompt)
    return result.prompt


# Export for backward compatibility
__all__ = [
    "generate_visual_prompt_with_ai",
    "get_generator",
    "AIPromptGenerator",
    "PromptResult",
    "ModelVersion",
]
