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

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for fonts to prevent reloading from disk every request
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
        # 512x768 is the golden ratio for SD-Turbo posters
        presets = {
            QualityPreset.FAST: cls(steps=1, width=512, height=768, guidance=0.0),
            QualityPreset.BALANCED: cls(steps=2, width=512, height=768, guidance=0.0),
            QualityPreset.QUALITY: cls(steps=4, width=512, height=768, guidance=0.0),
        }
        return presets.get(preset, presets[QualityPreset.QUALITY])


# --- 2. AI KEYWORDS ---
try:
    from .ai_keyword_generator import generate_visual_keywords_with_ai

    AI_KEYWORD_AVAILABLE = True
except ImportError:
    AI_KEYWORD_AVAILABLE = False


# --- 3. PROFESSIONAL TYPOGRAPHY ENGINE ---
class TextOverlayRenderer:
    @staticmethod
    def get_font(size: int, variant: str = "bold") -> ImageFont.FreeTypeFont:
        """
        Smart font loader that prioritizes 'Heavy' or 'Condensed' fonts for posters.
        """
        size = int(size)
        cache_key = f"{size}_{variant}"
        if cache_key in _font_cache:
            return _font_cache[cache_key]

        system = platform.system()
        candidates = []

        if system == "Windows":
            if variant == "title":
                # Big, chunky fonts for titles
                candidates = [
                    "C:/Windows/Fonts/impact.ttf",
                    "C:/Windows/Fonts/ariblk.ttf",
                    "C:/Windows/Fonts/calibrib.ttf",
                ]
            else:
                # Clean, readable fonts for meta data
                candidates = [
                    "C:/Windows/Fonts/arialbd.ttf",
                    "C:/Windows/Fonts/seguiSb.ttf",
                    "C:/Windows/Fonts/arial.ttf",
                ]
        else:  # Linux / Server
            if variant == "title":
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
                    "/usr/share/fonts/gnu-free/FreeSansBold.ttf",
                ]
            else:
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
                ]

        for path in candidates:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, size=size)
                    _font_cache[cache_key] = font
                    return font
                except:
                    continue
        return ImageFont.load_default()

    @staticmethod
    def draw_glow_text(
        draw_ctx,
        x,
        y,
        text,
        font,
        main_color="white",
        glow_color=(0, 0, 0),
        glow_radius=4,
    ):
        """
        Simulates a high-end glow/shadow effect by drawing multiple offset layers.
        Much cleaner than a simple drop shadow.
        """
        x, y = int(x), int(y)

        # Draw soft shadow layers
        # Layer 1: Wide blur
        offset = max(2, int(glow_radius / 2))
        draw_ctx.text(
            (x, y + offset),
            text,
            font=font,
            fill=(0, 0, 0, 120),
            anchor="mm",
            align="center",
        )

        # Layer 2: Tight hard shadow for definition
        draw_ctx.text(
            (x + 2, y + 2),
            text,
            font=font,
            fill=(0, 0, 0, 200),
            anchor="mm",
            align="center",
        )

        # Layer 3: Main Text
        draw_ctx.text(
            (x, y), text, font=font, fill=main_color, anchor="mm", align="center"
        )

    @staticmethod
    def render(img: Image.Image, info: Dict[str, str]) -> Image.Image:
        W, H = img.size

        # 1. Create Overlay Layer
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # 2. Cinematic Gradient Backdrop
        # Covers bottom 40% with a smooth sigmoid fade
        overlay_h = int(H * 0.45)
        for i in range(overlay_h):
            # Sigmoid fade logic for smoother gradient
            alpha = int((i / overlay_h) ** 1.5 * 240)
            y_pos = int(H - overlay_h + i)
            draw.rectangle([(0, y_pos), (W, y_pos + 1)], fill=(0, 0, 0, alpha))

        # 3. Typography Configuration
        # Dynamic sizing based on image width
        title_size = int(W * 0.12)  # 12% of width (Huge)
        meta_size = int(W * 0.035)  # 3.5% of width

        font_title = TextOverlayRenderer.get_font(title_size, variant="title")
        font_meta = TextOverlayRenderer.get_font(meta_size, variant="meta")

        # 4. Content Processing
        title = info.get("title", "EVENT").upper()
        # Intelligent Wrapping: Ensure text doesn't touch edges
        chars_per_line = 15  # Approximate for large impact font
        if len(title) > chars_per_line:
            wrapped_title = textwrap.fill(title, width=chars_per_line)
        else:
            wrapped_title = title

        # Date & Location
        raw_date = str(info.get("date", ""))
        clean_date = raw_date.split(" ")[0].split("T")[0] if raw_date else "TBD"
        location = info.get("location", "LOCATION").upper()
        meta_text = f"{clean_date}  |  {location}"

        # 5. Positioning Logic (Center Anchor)
        center_x = int(W / 2)

        # Calculate vertical positions from the bottom up
        padding_bottom = int(H * 0.08)

        # Position Meta Data
        meta_y = int(H - padding_bottom)

        # Position Divider Line
        divider_y = int(meta_y - meta_size - 25)

        # Position Title (Calculated based on number of lines)
        bbox = draw.multiline_textbbox(
            (0, 0), wrapped_title, font=font_title, align="center", spacing=10
        )
        title_h = bbox[3] - bbox[1]
        title_y = int(divider_y - 30 - (title_h / 2))  # Center of the title block

        # 6. Render Elements

        # A. Title
        TextOverlayRenderer.draw_glow_text(
            draw, center_x, title_y, wrapped_title, font_title, main_color="#FFFFFF"
        )

        # B. Neon Accent Line
        # A thick Cyan line with a soft glow
        line_w = int(W * 0.2)
        line_h = max(3, int(H * 0.005))
        # Glow for line
        draw.line(
            [(center_x - line_w / 2, divider_y), (center_x + line_w / 2, divider_y)],
            fill=(0, 229, 255, 100),
            width=line_h + 4,
        )
        # Main Line
        draw.line(
            [(center_x - line_w / 2, divider_y), (center_x + line_w / 2, divider_y)],
            fill="#00E5FF",
            width=line_h,
        )

        # C. Meta Data
        TextOverlayRenderer.draw_glow_text(
            draw,
            center_x,
            meta_y,
            meta_text,
            font_meta,
            main_color="#DDDDDD",
            glow_radius=2,
        )

        # 7. Merge and Return
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# --- 4. PROMPT ENGINEER ---
class PromptEngineer:
    @classmethod
    def build_prompt(
        cls, title: str, description: str, aesthetic: str, keywords: str = ""
    ) -> Tuple[str, str]:
        # Advanced style mapping
        aesthetic_map = {
            "modern": "vector art, flat design, minimal, clean lines, behance style, geometric shapes",
            "tech": "cyberpunk, neon, futuristic, digital art, glowing circuits, matrix style, synthwave",
            "professional": "corporate, sleek, elegant, business, high end, geometric, architectural background",
            "gaming": "3d render, unreal engine 5, fantasy art, cel shaded, vibrant, action shot, supercell style",
            "nature": "botanical illustration, lush green, organic, sunlight, studio ghibli style, environmental",
        }

        # Auto-detect gaming theme from title
        if (
            "clash" in title.lower()
            or "tournament" in title.lower()
            or "esport" in title.lower()
        ):
            if aesthetic == "modern":
                aesthetic = "gaming"

        style = aesthetic_map.get(aesthetic.lower(), "digital art")

        # The Secret Sauce: Negative Prompting
        # We explicitly ban text generation so our Python renderer can do the job
        positive = (
            f"epic event poster background for {title}, {style}, {keywords}, "
            "textless, no text, no typography, negative space for text, "
            "masterpiece, 8k resolution, volumetric lighting, dynamic composition, trending on artstation"
        )

        negative = (
            "text, letters, words, font, typography, signature, watermark, logo, "
            "blurry, low quality, pixelated, distorted, ugly, bad anatomy, "
            "abstract patterns, glitch, noise, messy"
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
        if self.pipeline is not None:
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
        # Memory Cleanup
        gc.collect()

        try:
            preset = QualityPreset(quality_mode)
        except:
            preset = QualityPreset.BALANCED
        cfg = GenerationConfig.from_preset(preset)

        pipe = self.load_pipeline()

        # AI Keywords Logic
        keywords = ""
        if AI_KEYWORD_AVAILABLE:
            try:
                keywords = generate_visual_keywords_with_ai(f"{title} {description}")
            except:
                pass

        pos, neg = PromptEngineer.build_prompt(title, description, aesthetic, keywords)

        logger.info(f"🎨 Generating '{title}'...")

        # Inference
        with torch.inference_mode():
            img = pipe(
                prompt=pos,
                negative_prompt=neg,
                width=cfg.width,
                height=cfg.height,
                num_inference_steps=cfg.steps,
                guidance_scale=cfg.guidance,
            ).images[0]

        # Render Text Overlay
        final_img = TextOverlayRenderer.render(
            img, {"title": title, "date": date, "location": location}
        )

        # Save
        output_dir = os.path.join(os.getcwd(), "static", "generated_posters")
        os.makedirs(output_dir, exist_ok=True)
        filename = f"poster_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(output_dir, filename)

        # Save high quality PNG
        final_img.save(path, optimize=True, quality=95)

        # Final Cleanup
        gc.collect()

        return f"/static/generated_posters/{filename}"


# --- 6. EXPORTED FUNCTION ---
def generate_event_poster(
    title, date, location, description, aesthetic="modern", quality_mode="quality"
):
    generator = PosterGenerator()
    return generator.generate(title, date, location, description, aesthetic)
