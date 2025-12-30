import torch
import os
import uuid
import logging
import platform
import gc
import threading
from typing import Dict, Tuple
from dataclasses import dataclass
from enum import Enum
from PIL import Image, ImageDraw, ImageFont
from diffusers import AutoPipelineForText2Image

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for fonts
_font_cache = {}


# --- 1. CONFIGURATION ---
class QualityPreset(Enum):
    FAST = "fast"  # 1 step
    BALANCED = "balanced"  # 2 steps
    QUALITY = "quality"  # 4 steps


@dataclass
class GenerationConfig:
    steps: int
    width: int
    height: int
    guidance: float

    @classmethod
    def from_preset(cls, preset: QualityPreset) -> "GenerationConfig":
        presets = {
            QualityPreset.FAST: cls(steps=1, width=512, height=768, guidance=0.0),
            QualityPreset.BALANCED: cls(steps=2, width=512, height=768, guidance=0.0),
            QualityPreset.QUALITY: cls(steps=4, width=512, height=768, guidance=0.0),
        }
        return presets.get(preset, presets[QualityPreset.BALANCED])


# --- 2. AI KEYWORDS ---
try:
    from .ai_keyword_generator import generate_visual_keywords_with_ai

    AI_KEYWORD_AVAILABLE = True
except ImportError:
    AI_KEYWORD_AVAILABLE = False


# --- 3. TEXT RENDERER ---
class TextOverlayRenderer:
    @staticmethod
    def get_font(size: int) -> ImageFont.FreeTypeFont:
        if size in _font_cache:
            return _font_cache[size]

        system = platform.system()
        candidates = []
        if system == "Windows":
            candidates = [
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/calibrib.ttf",
            ]
        else:
            candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
            ]

        for path in candidates:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, size=size)
                    _font_cache[size] = font
                    return font
                except:
                    continue
        return ImageFont.load_default()

    @staticmethod
    def render(img: Image.Image, info: Dict[str, str]) -> Image.Image:
        W, H = img.size
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Gradient Backdrop
        overlay_h = int(H * 0.30)
        for i in range(overlay_h):
            alpha = int((i / overlay_h) * 200)
            draw.rectangle(
                [(0, H - overlay_h + i), (W, H - overlay_h + i + 1)],
                fill=(0, 0, 0, alpha),
            )

        # Text Logic
        padding = int(W * 0.08)
        font_title = TextOverlayRenderer.get_font(max(24, int(W / 12)))
        font_meta = TextOverlayRenderer.get_font(max(14, int(W / 26)))

        title = info.get("title", "Event").upper()
        title_y = H - overlay_h + int(overlay_h * 0.3)

        # Shadow & Main Text
        draw.text(
            (padding + 2, title_y + 2), title, font=font_title, fill=(0, 0, 0, 180)
        )
        draw.text((padding, title_y), title, font=font_title, fill="white")

        meta = f"{info.get('date', 'TBD')}  •  {info.get('location', 'TBD')}"
        meta_y = title_y + int(W / 12) + 15
        draw.text((padding, meta_y), meta, font=font_meta, fill="#DDDDDD")

        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# --- 4. MAIN GENERATOR (SINGLETON) ---
class PosterGenerator:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        # Thread-safe Singleton Pattern
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance.pipeline = None
                cls._instance.model_id = "stabilityai/sd-turbo"
        return cls._instance

    def load_pipeline(self):
        # Only load if not already loaded
        if self.pipeline is not None:
            return self.pipeline

        logger.info(f"⏳ Loading Pipeline (One-time setup): {self.model_id}")

        try:
            pipe = AutoPipelineForText2Image.from_pretrained(
                self.model_id, torch_dtype=torch.float32, use_safetensors=True
            )

            # CPU Optimizations
            pipe.to("cpu")
            pipe.enable_attention_slicing()
            # Note: Removed enable_model_cpu_offload as suggested (redundant for pure CPU)

            self.pipeline = pipe
            return pipe
        except Exception as e:
            logger.error(f"Failed to load pipeline: {e}")
            raise e

    def generate(
        self,
        title,
        date,
        location,
        description,
        aesthetic="modern",
        quality_mode="balanced",
    ):
        # 1. Config & cleanup
        gc.collect()

        try:
            preset = QualityPreset(quality_mode)
        except:
            preset = QualityPreset.BALANCED
        cfg = GenerationConfig.from_preset(preset)

        # 2. Pipeline Loading
        pipe = self.load_pipeline()

        # 3. Prompt Engineering
        keywords = ""
        if AI_KEYWORD_AVAILABLE:
            try:
                keywords = generate_visual_keywords_with_ai(f"{title} {description}")
            except:
                pass

        style_map = {
            "modern": "vector art, flat design, minimal, clean lines",
            "tech": "cyberpunk, neon, futuristic, digital art",
            "professional": "corporate, sleek, elegant, business",
            "gaming": "esports, vibrant, energetic, dynamic",
        }
        style = style_map.get(aesthetic.lower(), "digital art")

        prompt = (
            f"event poster for {title}, {style}, {keywords}, "
            "professional graphic design, 8k, vibrant colors, trending on artstation"
        )
        neg_prompt = "text, letters, watermark, blurry, low quality, distorted"

        logger.info(f"🎨 Generating '{title}' ({cfg.steps} steps)...")

        # 4. Generation (With Inference Mode for Memory Safety)
        with torch.inference_mode():
            img = pipe(
                prompt=prompt,
                negative_prompt=neg_prompt,
                width=cfg.width,
                height=cfg.height,
                num_inference_steps=cfg.steps,
                guidance_scale=cfg.guidance,
            ).images[0]

        # 5. Overlay & Save
        clean_date = str(date).split("T")[0] if date else "TBD"
        final_img = TextOverlayRenderer.render(
            img, {"title": title, "date": clean_date, "location": location}
        )

        output_dir = os.path.join(os.getcwd(), "static", "generated_posters")
        os.makedirs(output_dir, exist_ok=True)
        filename = f"poster_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(output_dir, filename)

        final_img.save(path, optimize=True, quality=90)

        # 6. Aggressive Cleanup
        gc.collect()

        return f"/static/generated_posters/{filename}"


# --- 5. EXPORTED FUNCTION ---
def generate_event_poster(title, date, location, description, aesthetic="modern"):
    # This call is now super fast after the first time because of Singleton
    generator = PosterGenerator()
    return generator.generate(title, date, location, description, aesthetic)
