import torch
import os
import uuid
import logging
import platform
import gc
import threading
import textwrap
from typing import Dict, Tuple
from dataclasses import dataclass
from enum import Enum
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from diffusers import AutoPipelineForText2Image

# --- LOGGING SETUP ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global Font Cache
_font_cache = {}


# --- 1. CONFIGURATION ---
class QualityPreset(Enum):
    FAST = "fast"  # 1 step (SD-Turbo)
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
        # 512x768 is the optimal portrait ratio for SD-Turbo on CPU
        presets = {
            QualityPreset.FAST: cls(steps=1, width=512, height=768, guidance=0.0),
            QualityPreset.BALANCED: cls(steps=2, width=512, height=768, guidance=0.0),
            QualityPreset.QUALITY: cls(steps=4, width=512, height=768, guidance=0.0),
        }
        return presets.get(preset, presets[QualityPreset.BALANCED])


# --- 2. AI PROMPT INTEGRATION ---
try:
    # We try to import the specific AI prompt generator
    from .ai_keyword_generator import generate_visual_prompt_with_ai

    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False


# --- 3. CINEMATIC TEXT RENDERER ---
class TextOverlayRenderer:
    @staticmethod
    def get_font_path(variant: str = "bold") -> str:
        """Finds the best available font path based on the OS."""
        system = platform.system()
        candidates = []

        if system == "Windows":
            if variant == "title":
                candidates = [
                    "C:/Windows/Fonts/impact.ttf",
                    "C:/Windows/Fonts/ariblk.ttf",
                    "C:/Windows/Fonts/arialbd.ttf",
                ]
            else:
                candidates = [
                    "C:/Windows/Fonts/calibrib.ttf",
                    "C:/Windows/Fonts/seguiSb.ttf",
                    "C:/Windows/Fonts/arial.ttf",
                ]
        else:  # Linux / Server
            if variant == "title":
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
                    "/usr/share/fonts/gnu-free/FreeSansBold.ttf",
                    "/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf",
                ]
            else:
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
                ]

        for path in candidates:
            if os.path.exists(path):
                return path
        return None

    @staticmethod
    def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
        """Safely loads a font with caching."""
        size = int(size)
        if path is None:
            return ImageFont.load_default()
        key = f"{path}_{size}"
        if key in _font_cache:
            return _font_cache[key]
        try:
            font = ImageFont.truetype(path, size)
            _font_cache[key] = font
            return font
        except:
            return ImageFont.load_default()

    @staticmethod
    def fit_text_to_width(
        draw: ImageDraw,
        text: str,
        font_path: str,
        max_width: int,
        max_height: int,
        start_size: int,
    ) -> Tuple[ImageFont.FreeTypeFont, str, int]:
        """
        Dynamically adjusts font size and wrapping to fit the text into the allotted space.
        Returns: (font_object, wrapped_text, text_height)
        """
        size = int(start_size)
        min_size = 20

        while size >= min_size:
            font = TextOverlayRenderer.load_font(font_path, size)

            # Estimate chars per line: Avg char width is roughly size * 0.55 for bold fonts
            avg_char_w = size * 0.55
            chars_per_line = max(6, int(max_width / avg_char_w))

            wrapped = textwrap.fill(text, width=chars_per_line)

            # Check dimensions
            bbox = draw.multiline_textbbox(
                (0, 0), wrapped, font=font, align="center", spacing=10
            )
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]

            if w <= max_width and h <= max_height:
                return font, wrapped, int(h)

            size -= 4  # Shrink and retry

        # Fallback
        return (
            TextOverlayRenderer.load_font(font_path, min_size),
            textwrap.fill(text, 20),
            50,
        )

    @staticmethod
    def draw_cinematic_text(draw_ctx, x, y, text, font, color="#FFFFFF", spacing=10):
        """
        Draws text with a 3-layer shadow stack for maximum readability and depth.
        """
        x, y = int(x), int(y)

        # Layer 1: Deep ambient shadow (Wide & Soft)
        draw_ctx.multiline_text(
            (x, y + 6),
            text,
            font=font,
            fill=(0, 0, 0, 60),
            anchor="mm",
            align="center",
            spacing=spacing,
        )

        # Layer 2: Medium definition shadow
        draw_ctx.multiline_text(
            (x, y + 3),
            text,
            font=font,
            fill=(0, 0, 0, 120),
            anchor="mm",
            align="center",
            spacing=spacing,
        )

        # Layer 3: Tight hard shadow (Contrast)
        draw_ctx.multiline_text(
            (x + 1, y + 1),
            text,
            font=font,
            fill=(0, 0, 0, 220),
            anchor="mm",
            align="center",
            spacing=spacing,
        )

        # Layer 4: Main Text
        draw_ctx.multiline_text(
            (x, y),
            text,
            font=font,
            fill=color,
            anchor="mm",
            align="center",
            spacing=spacing,
        )

    @staticmethod
    def render(img: Image.Image, info: Dict[str, str]) -> Image.Image:
        W, H = img.size

        # 1. Background Legibility Booster
        # Take the bottom 55% of the image, blur it slightly, and darken it.
        split_y = int(H * 0.45)
        bottom_area = img.crop((0, split_y, W, H))

        # Blur & Darken
        bottom_area = bottom_area.filter(ImageFilter.GaussianBlur(radius=8))
        enhancer = ImageEnhance.Brightness(bottom_area)
        bottom_area = enhancer.enhance(0.70)

        img.paste(bottom_area, (0, split_y))

        # 2. Gradient Overlay (Smooth fade to black at very bottom)
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        grad_h = int(H * 0.40)
        for i in range(grad_h):
            alpha = int((i / grad_h) ** 1.8 * 230)  # Exponential fade
            y_pos = int(H - grad_h + i)
            draw.rectangle([(0, y_pos), (W, y_pos + 1)], fill=(0, 0, 0, alpha))

        # 3. Content Preparation
        title = info.get("title", "EVENT").upper()
        raw_date = str(info.get("date", ""))
        clean_date = raw_date.split(" ")[0].split("T")[0] if raw_date else "TBD"
        location = info.get("location", "LOCATION").upper()
        meta_text = f"{clean_date}  |  {location}"

        # 4. Font Loading & Fitting
        title_font_path = TextOverlayRenderer.get_font_path("title")
        meta_font_path = TextOverlayRenderer.get_font_path("meta")

        # Dynamic Limits
        max_title_w = int(W * 0.90)
        max_title_h = int(H * 0.28)
        start_title_size = int(W * 0.20)  # Start HUGE (20% of width)

        # Fit Title
        font_title, wrapped_title, title_h = TextOverlayRenderer.fit_text_to_width(
            draw, title, title_font_path, max_title_w, max_title_h, start_title_size
        )

        # Fit Meta
        font_meta = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.045))
        bbox_meta = draw.textbbox((0, 0), meta_text, font=font_meta)
        meta_h = bbox_meta[3] - bbox_meta[1]

        # 5. Positioning (Bottom-Up Logic)
        center_x = int(W / 2)

        # Padding from bottom edge
        padding_bottom = int(H * 0.08)

        # Meta Position
        meta_y = int(H - padding_bottom - (meta_h / 2))

        # Divider Line Position
        divider_spacing = 25
        divider_y = int(meta_y - (meta_h / 2) - divider_spacing)

        # Title Position
        title_y = int(divider_y - divider_spacing - (title_h / 2))

        # 6. Render Elements

        # A. Title (White with Cinema Shadow)
        TextOverlayRenderer.draw_cinematic_text(
            draw, center_x, title_y, wrapped_title, font_title
        )

        # B. Neon Divider Line
        line_w = int(W * 0.25)
        line_h = max(3, int(H * 0.005))

        # Glow Effect
        draw.line(
            [(center_x - line_w / 2, divider_y), (center_x + line_w / 2, divider_y)],
            fill=(0, 229, 255, 80),
            width=line_h + 6,
        )
        # Core Line
        draw.line(
            [(center_x - line_w / 2, divider_y), (center_x + line_w / 2, divider_y)],
            fill="#00E5FF",
            width=line_h,
        )

        # C. Meta Data
        TextOverlayRenderer.draw_cinematic_text(
            draw, center_x, meta_y, meta_text, font_meta, color="#DDDDDD"
        )

        # 7. Merge
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# --- 4. PROMPT ENGINEER ---
class PromptEngineer:
    @classmethod
    def build_prompt(
        cls, title: str, aesthetic: str, ai_description: str = ""
    ) -> Tuple[str, str]:
        # Standard Negative Prompt
        negative = (
            "text, letters, words, font, typography, watermark, logo, signature, "
            "blurry, pixelated, low quality, ugly, deformed, bad anatomy, "
            "abstract patterns, glitch, noise, messy, collage, white border"
        )

        # Strategy: Use Rich AI Description if available, else Fallback Templates
        if ai_description and len(ai_description) > 15:
            # Use the detailed description from Gemini
            positive = (
                f"{ai_description}, "
                "textless, no text, no typography, negative space at bottom, "
                "masterpiece, 8k resolution, trending on artstation, cinematic lighting, "
                "clean composition"
            )
        else:
            # Fallback Template Logic
            style_map = {
                "modern": "vector art, flat design, minimal, clean lines",
                "tech": "cyberpunk, neon, futuristic, glowing circuits, matrix",
                "gaming": "3d render, unreal engine 5, character art, action shot, vibrant",
                "nature": "botanical illustration, lush green, organic, sunlight",
            }

            # Simple keyword matching for aesthetic override
            t_low = title.lower()
            if any(x in t_low for x in ["clash", "tournament", "esport"]):
                aesthetic = "gaming"
            elif any(x in t_low for x in ["hackathon", "ai", "cyber"]):
                aesthetic = "tech"

            style = style_map.get(aesthetic, "digital art")

            positive = (
                f"epic event poster background for {title}, {style}, "
                "textless, no text, no typography, negative space at bottom, "
                "masterpiece, 8k resolution, cinematic lighting"
            )

        return positive, negative


# --- 5. MAIN GENERATOR (SINGLETON) ---
class PosterGenerator:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance.pipeline = None
                cls._instance.model_id = "stabilityai/sd-turbo"
        return cls._instance

    def load_pipeline(self):
        if self.pipeline:
            return self.pipeline
        logger.info(f"⏳ Loading Pipeline: {self.model_id}")
        try:
            pipe = AutoPipelineForText2Image.from_pretrained(
                self.model_id, torch_dtype=torch.float32, use_safetensors=True
            )
            pipe.to("cpu")
            pipe.enable_attention_slicing()
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
        # 1. Cleanup
        gc.collect()

        # 2. Config
        try:
            preset = QualityPreset(quality_mode)
        except:
            preset = QualityPreset.BALANCED
        cfg = GenerationConfig.from_preset(preset)

        # 3. Pipeline
        pipe = self.load_pipeline()

        # 4. Get Rich Prompt (Gemini)
        ai_prompt = ""
        if AI_AVAILABLE:
            try:
                # Combine title and description for context
                context = f"Title: {title}. Description: {description}"
                ai_prompt = generate_visual_prompt_with_ai(context)
                logger.info(f"🧠 AI Prompt Used: {ai_prompt[:60]}...")
            except Exception as e:
                logger.warning(f"AI Gen failed: {e}")

        # 5. Build Final Prompt
        pos, neg = PromptEngineer.build_prompt(title, aesthetic, ai_prompt)

        logger.info(f"🎨 Generating Image...")

        # 6. Inference
        with torch.inference_mode():
            img = pipe(
                prompt=pos,
                negative_prompt=neg,
                width=cfg.width,
                height=cfg.height,
                num_inference_steps=cfg.steps,
                guidance_scale=cfg.guidance,
            ).images[0]

        # 7. Render Text Overlay
        final_img = TextOverlayRenderer.render(
            img, {"title": title, "date": date, "location": location}
        )

        # 8. Save
        output_dir = os.path.join(os.getcwd(), "static", "generated_posters")
        os.makedirs(output_dir, exist_ok=True)
        filename = f"poster_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(output_dir, filename)

        final_img.save(path, optimize=True, quality=95)

        # 9. Cleanup
        gc.collect()

        return f"/static/generated_posters/{filename}"


# --- 6. EXPORTED ENTRY POINT ---
def generate_event_poster(title, date, location, description, aesthetic="modern"):
    generator = PosterGenerator()
    return generator.generate(title, date, location, description, aesthetic)
