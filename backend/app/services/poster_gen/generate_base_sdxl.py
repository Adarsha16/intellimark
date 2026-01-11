import torch
import os
import time
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
from dateutil import parser as date_parser
from datetime import datetime as dt
from app.services.progress_tracker import ProgressTracker
from app.services.file_lock import SystemFileLock

# Check AI Availability (Gemini)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global Font Cache
_font_cache = {}

# --- LoRA Support ---
LORA_DIR = os.path.join(os.getcwd(), "models", "loras")
os.makedirs(LORA_DIR, exist_ok=True)

def _find_lora_file():
    """Returns the path to the first .safetensors LoRA file found, or None."""
    if not os.path.exists(LORA_DIR):
        return None
    for f in os.listdir(LORA_DIR):
        if f.endswith(".safetensors"):
            return os.path.join(LORA_DIR, f)
    return None


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
            QualityPreset.BALANCED: cls(steps=2, width=512, height=768, guidance=1.0),
            QualityPreset.QUALITY: cls(steps=3, width=720, height=1080, guidance=0.0), # Best Quality (User Request)
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
    def get_font_path(variant: str = "bold", style: str = "Modern") -> str:
        """Finds the best available font path based on OS and Style."""
        system = platform.system()
        candidates = []

        # Windows Font Definitions
        if system == "Windows":
            if style == "Tech":
                candidates = ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"]
            elif style == "Serif":
                candidates = ["C:/Windows/Fonts/times.ttf", "C:/Windows/Fonts/georgia.ttf"]
            elif style == "Handwritten":
                candidates = ["C:/Windows/Fonts/segoesc.ttf", "C:/Windows/Fonts/comic.ttf"]
            elif style == "Bold":
                candidates = ["C:/Windows/Fonts/impact.ttf", "C:/Windows/Fonts/arialbd.ttf"]
            else: # Modern/Default
                candidates = ["C:/Windows/Fonts/seguiSb.ttf", "C:/Windows/Fonts/calibrib.ttf", "C:/Windows/Fonts/arial.ttf"]
            
            # Title overrides for impact
            if variant == "title" and style not in ["Tech", "Serif", "Handwritten"]:
                 candidates.insert(0, "C:/Windows/Fonts/impact.ttf")

        # Linux/Server Font Definitions
        else:
             if style == "Tech":
                candidates = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"]
             elif style == "Serif":
                candidates = ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]
             else:
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf", 
                ]

        for path in candidates:
            if os.path.exists(path):
                return path
        
        # Fallback to defaults
        return "C:/Windows/Fonts/arial.ttf" if system == "Windows" else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

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

            wrapped = textwrap.fill(text, width=chars_per_line, break_long_words=False)

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
    def _format_datetime(date_str: str) -> str:
        """Parses raw date string and returns nice format: JAN 01 • 12:00 PM"""
        try:
            if not date_str or date_str == "None":
                return "TBD"
            # Parse ISO or raw string
            dt = date_parser.parse(str(date_str))
            # Convert to Local System Timezone (Fixes 6:15 AM vs 12:00 PM issue)
            dt_local = dt.astimezone()
            # Format: DEC 28 • 12:00 PM
            return dt_local.strftime("%b %d • %I:%M %p").upper()
        except Exception as e:
            print(f"Date parse error: {e}")
            return str(date_str).split("T")[0]

    @staticmethod
    @staticmethod
    def draw_cinematic_text(draw_ctx, x, y, text, font, color="#FFFFFF", spacing=10, align="center", anchor="mm"):
        x, y = int(x), int(y)
        
        # Calculate dynamic stroke width (3% of font size, min 2px)
        s_width = max(2, int(font.size * 0.03))
        
        # Layer 1: Strong Drop Shadow (Offset)
        draw_ctx.multiline_text(
            (x + s_width + 1, y + s_width + 1), 
            text, 
            font=font, 
            fill=(0, 0, 0, 180), 
            anchor=anchor, 
            align=align, 
            spacing=spacing
        )
        
        # Layer 2: Main Text with Outline (Stroke)
        draw_ctx.multiline_text(
            (x, y), 
            text, 
            font=font, 
            fill=color, 
            anchor=anchor, 
            align=align, 
            spacing=spacing,
            stroke_width=s_width,
            stroke_fill="black"
        )

    @staticmethod
    def _render_layout_modern_left(draw, W, H, info, design, overlay_draw):
        """Top-Left aligned layout with vertical accent bar."""
        # Config
        margin_x = int(W * 0.08)
        primary = design.get("primary_color", "#FFFFFF")
        secondary = design.get("secondary_color", "#00E5FF")
        
        # Fonts
        title_font_path = TextOverlayRenderer.get_font_path("title", design.get("font_style"))
        meta_font_path = TextOverlayRenderer.get_font_path("meta", design.get("font_style"))
        
        # 1. Title (Top Left) - Wraps to 60% width
        # Increased font scalars by ~20%
        font_title, wrapped_title, title_h = TextOverlayRenderer.fit_text_to_width(
            draw, info["title"].upper(), title_font_path, int(W * 0.65), int(H * 0.35), int(W * 0.18)
        )
        title_y = int(H * 0.12)
        
        TextOverlayRenderer.draw_cinematic_text(
            draw, margin_x, title_y, wrapped_title, font_title, color=primary, align="left", anchor="la"
        )

        # 2. Prize (Below Title)
        next_y = title_y + title_h + 30
        prize_h = 0
        if info.get("prize"):
             prize_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.05))
             bbox_prize = draw.textbbox((0,0), f"{info['prize']}", font=prize_font)
             prize_h = bbox_prize[3] - bbox_prize[1]
             TextOverlayRenderer.draw_cinematic_text(
                draw, margin_x, next_y, f"{info['prize']}", prize_font, color="#FFD700", align="left", anchor="la"
            )
             next_y += prize_h + 20

        # 2. Prize (Below Title)
        next_y = title_y + title_h + 30
        prize_h = 0
        if info.get("prize"):
             prize_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.05))
             bbox_prize = draw.textbbox((0,0), f"{info['prize']}", font=prize_font)
             prize_h = bbox_prize[3] - bbox_prize[1]
             TextOverlayRenderer.draw_cinematic_text(
                draw, margin_x, next_y, f"{info['prize']}", prize_font, color="#FFD700", align="left", anchor="la"
            )
             next_y += prize_h + 20

        # 3. Meta (Below Prize/Title)
        # Moved from bottom to top as requested
        clean_date = TextOverlayRenderer._format_datetime(info.get("date"))
        meta_text = f"{clean_date}\n{info.get('location', '').upper()}"
        meta_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.045))
        
        TextOverlayRenderer.draw_cinematic_text(
            draw, margin_x, next_y, meta_text, meta_font, color="#DDDDDD", align="left", anchor="la", spacing=12
        )
        
        # Calculate total height for accent bar
        bbox_meta = draw.multiline_textbbox((0,0), meta_text, font=meta_font, spacing=12)
        meta_h = bbox_meta[3] - bbox_meta[1]
        total_content_h = (next_y + meta_h) - title_y

        # 4. Accent Bar (Dynamic Height)
        bar_x = int(margin_x * 0.6)
        draw.line([(bar_x, title_y), (bar_x, title_y + total_content_h + 20)], fill=secondary, width=12)

        # 5. Organizer (Kept at Bottom Right for Balance)
        if info.get("organizer"):
            org_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.035))
            TextOverlayRenderer.draw_cinematic_text(
                draw, W - margin_x, int(H * 0.88), f"PRESENTED BY\n{info['organizer'].upper()}", 
                org_font, color="#AAAAAA", align="right", anchor="ra", spacing=15
            )

    @staticmethod
    def _render_layout_classic_center(draw, W, H, info, design, overlay_draw):
        """Classic centered movie-poster stack."""
        primary = design.get("primary_color", "#FFFFFF")
        secondary = design.get("secondary_color", "#00E5FF")
        center_x = int(W / 2)
        
        # Fonts
        title_font_path = TextOverlayRenderer.get_font_path("title", design.get("font_style"))
        meta_font_path = TextOverlayRenderer.get_font_path("meta", design.get("font_style"))

        # 1. Fits
        # Increased to 25% width scalar
        font_title, wrapped_title, title_h = TextOverlayRenderer.fit_text_to_width(
            draw, info["title"].upper(), title_font_path, int(W * 0.95), int(H * 0.35), int(W * 0.25)
        )
        
        # 2. Meta Calculation
        clean_date = TextOverlayRenderer._format_datetime(info.get("date"))
        meta_text = f"{clean_date}  |  {info.get('location', '').upper()}"
        
        # Dynamic Fit for Footer (Avoid clipping)
        target_width = int(W * 0.90) 
        font_size = int(W * 0.05) # Start slightly smaller (was 0.055)
        font_meta = TextOverlayRenderer.load_font(meta_font_path, font_size)
        
        # Shrink until fits
        while font_size > 10:
             bbox = draw.textbbox((0, 0), meta_text, font=font_meta)
             text_w = bbox[2] - bbox[0]
             if text_w < target_width:
                 break
             font_size -= 2
             font_meta = TextOverlayRenderer.load_font(meta_font_path, font_size)

        bbox_meta = draw.textbbox((0, 0), meta_text, font=font_meta)
        meta_h = bbox_meta[3] - bbox_meta[1]

        # 3. Y-Positions (Bottom-Up)
        padding_bottom = int(H * 0.08)
        meta_y = int(H - padding_bottom - (meta_h / 2))
        divider_y = meta_y - meta_h - 40
        title_y = divider_y - 40 - (title_h / 2)

        # Adjust for Prize
        if info.get("prize"):
            title_y -= 60 

        # 4. Render
        # Title
        TextOverlayRenderer.draw_cinematic_text(draw, center_x, title_y, wrapped_title, font_title, color=primary)
        
        # Prize (Between Title and Line)
        if info.get("prize"):
            prize_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.05))
            TextOverlayRenderer.draw_cinematic_text(
                draw, center_x, title_y + (title_h/2) + 30, f"{info['prize']}", prize_font, color="#FFD700"
            )

        # Neon Line
        w_line = int(W * 0.3)
        draw.line([(center_x - w_line/2, divider_y), (center_x + w_line/2, divider_y)], fill=secondary+"60", width=8)
        draw.line([(center_x - w_line/2, divider_y), (center_x + w_line/2, divider_y)], fill=secondary, width=2)

        # Meta
        TextOverlayRenderer.draw_cinematic_text(draw, center_x, meta_y, meta_text, font_meta, color="#DDDDDD")
        
        # Organizer (Top)
        if info.get("organizer"):
            org_font = TextOverlayRenderer.load_font(meta_font_path, int(W * 0.03))
            TextOverlayRenderer.draw_cinematic_text(draw, center_x, int(H * 0.05), f"PRESENTED BY {info['organizer'].upper()}", org_font, color="#AAAAAA")

    @staticmethod
    def render(img: Image.Image, info: Dict[str, str], design: Dict[str, str] = None) -> Image.Image:
        W, H = img.size
        
        # Default Design
        if not design:
            design = {
                "theme": "Modern",
                "primary_color": "#FFFFFF",
                "secondary_color": "#00E5FF",
                "font_style": "Modern",
                "layout": "Center"
            }

        primary_color = design.get("primary_color", "#FFFFFF")
        sec_color = design.get("secondary_color", "#00E5FF")
        font_style = design.get("font_style", "Modern")
        layout = design.get("layout", "Center")

        # [REMOVED] 1. Background Legibility Booster
        # User requested to remove the blur/darkening of the lower half.
        # split_y = int(H * 0.45)
        # bottom_area = img.crop((0, split_y, W, H))
        # bottom_area = bottom_area.filter(ImageFilter.GaussianBlur(radius=8))
        # enhancer = ImageEnhance.Brightness(bottom_area)
        # bottom_area = enhancer.enhance(0.70)
        # img.paste(bottom_area, (0, split_y))

        # 2. Gradient Overlay (Darker and Taller)
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        grad_h = int(H * 0.60)  # Covered 60% of height (was 40%)
        for i in range(grad_h):
            # Cubic fade for stronger bottom darkness
            alpha = int((i / grad_h) ** 3 * 255) 
            y_pos = int(H - grad_h + i)
            draw.rectangle([(0, y_pos), (W, y_pos + 1)], fill=(0, 0, 0, alpha))
            
        # 3. Layout Dispatcher
        layout_norm = design.get("layout", "Center").lower().replace(" ", "").replace("-", "")
        
        print(f"DEBUG: Rendering Layout: {layout_norm}")
        
        if "left" in layout_norm or "modern" in layout_norm:
            TextOverlayRenderer._render_layout_modern_left(draw, W, H, info, design, draw)
        else:
            TextOverlayRenderer._render_layout_classic_center(draw, W, H, info, design, draw)

        # 4. Merge
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# --- 4. PROMPT ENGINEER ---
class PromptEngineer:
    @classmethod
    def build_prompt(
        cls, title: str, aesthetic: str, ai_description: str = "", style_data: Dict[str, str] = None, cfg=None
    ) -> Tuple[str, str]:
        # 1. Define Style Presets (The "Secret Sauce")
        # UPDATED: Removed strong nouns (like 'city', 'stadium') to prevent overriding the AI's specific subject.
        STYLE_PRESETS = {
            "Cyberpunk": "neon aesthetic, clean sharp lines, high contrast, futuristic vibe, synthwave color palette, volumetric fog, 8k resolution, detailed",
            "Tech": "digital art, glowing circuits, data visualization style, glassmorphism, dark mode aesthetic, sharp focus, detailed",
            "Modern": "bauhaus graphic design, minimalist, flat vector art, clean geometric shapes, abstract composition, corporate memphis style, vector quality",
            "Elegant": "luxury gold texture, black marble finish, bokeh lighting effect, silk fabric texture, cinematic lighting, shallow depth of field, premium look",
            "Retro": "vintage 80s poster style, cassette futurism, washed out warm colors, stranger things aesthetic, detailed, cinematic lighting",
            "Organic": "botanical illustration style, paper texture, soft shadows, sustainable aesthetic, nature photography style, earth tones, hyperrealistic",
            "Grunge": "street art style, paint splatter effect, riot aesthetic, raw energy, underground vibe, detailed texture",
            "Gaming": "unreal engine 5 render, dynamic action angle, vibrant energy, 3d digital art, ray tracing, high fidelity, sharp detailing",
            "Cartoon": "ligne claire style, flat vector illustration, thick black outlines, bold colors, comic book art, clean crisp lines, no noise, no shading, minimal"
        }

        # 2. Determine Style Keywords
        # Auto-detect "Cartoony" requirement for Gaming/Hackathons/Tech (Fixes graininess)
        check_title = title.lower()
        if any(x in check_title for x in ["hackathon", "valorant", "gaming", "esports", "pubg", "fortnite", "minecraft", "roblox", "tournament", "coding", "dev", "code", "wrestling", "fight", "sumo", "boxing", "match"]):
            theme = "Cartoon"
        else:
            theme = style_data.get("theme", "Modern") if style_data else "Modern"
            
        style_keywords = STYLE_PRESETS.get(theme, STYLE_PRESETS["Modern"])

        # 3. Build Negative Prompt
        negative = (
            "(text:2.0), (letters:2.0), (words:2.0), (font:2.0), (watermark:2.0), (logo:2.0), (signature:2.0), (hud:1.5), (ui:1.5), "
            "(badge:2.0), (stamp:2.0), (circular icon:2.0), (corner text:2.0), (border:1.5), (frame:1.5), "
            "blurry, pixelated, low quality, ugly, deformed, bad anatomy, "
            "grain, noise, glitch, chromatic aberration, distortion, "
            "crowded, busy, messy, complex patterns, high frequency detail, clutter, "
            "(bad hands:1.5), (missing fingers:1.5), (extra limbs:1.5), (fused fingers:1.5), (mutation:1.2), (malformed limbs:1.2)"
        )

        # 4. Build Positive Prompt
        # 4. Build Positive Prompt
        # [AGGRESSIVE OVERRIDE FOR CARTOON]
        check_title = title.lower()
        if theme == "Cartoon" or any(x in check_title for x in ["hackathon", "valorant", "gaming", "esports", "wrestling", "fight", "sumo", "boxing"]):
             # "Lying to the AI" Strategy:
             # Using "Hackathon" triggers circuit board mess.
             # Using "Technology Icon" triggers clean minimalism.
             subject_map = {
                 "hackathon": "orange laptop",
                 "valorant": "blue futuristic gun", 
                 "gaming": "game controller",
                 "gaming": "game controller",
                 "esports": "trophy",
                 "sumo": "sumo wrestler character",
                 "boxing": "boxing gloves",
                 "wrestling": "wrestler mask",
                 "fight": "fist"
             }
             subject = "technology object"
             for k, v in subject_map.items():
                 if k in check_title: subject = v
                 
             positive = (
                 f"minimalist flat vector icon of {subject}, {style_keywords}, "
                 "(vast white background:1.5), (centered:1.3), (small subject:1.2), "
                 "single object, solid white background, clean lines, behance, correct geometry, simple"
             )
             # Force clean background in negative
             negative += ", (background pattern:1.5), (crowd:1.5), (cluttered:1.5), (texture:1.5), (grain:1.5), (noise:1.5), (stretched:1.5), (long face:1.5), (distorted aspect ratio:1.5), (detailed background:1.5)"
             
             # [IMPORTANT] Turbo expects 0.0 guidance. Higher values = Noise.
             cfg.steps = 2
             cfg.guidance = 0.0
             
        elif ai_description and len(ai_description) > 15:
            # Combined: AI Description + Enforced Style + Quality Boosters
            # Added ( :1.2) weight to subject to force adherence
            positive = (
                f"({ai_description}:1.15), {style_keywords}, "
                "masterpiece, best quality, 8k resolution, cinematic lighting"
            )
        else:
            # Fallback Construction
            positive = (
                f"background poster art for {title}, {style_keywords}, "
                "masterpiece, best quality, 8k resolution, cinematic lighting, "
                "minimalist, clean composition, copy space"
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

    def load_pipeline(self, event_id=None):
        # Always reload to ensure clean state if previous run crashed/leaked
        if self.pipeline:
             return self.pipeline
             
        logger.info(f"⏳ Loading Pipeline: {self.model_id}")
        if event_id: ProgressTracker.set_progress(event_id, 8, "Loading AI Core... First run may take 5+ mins (Downloading Model)")
        try:
            pipe = AutoPipelineForText2Image.from_pretrained(
                self.model_id, torch_dtype=torch.float32, use_safetensors=True
            )
            pipe.to("cpu")
            pipe.enable_attention_slicing()
            
            # --- LoRA Loading ---
            lora_path = _find_lora_file()
            if lora_path:
                logger.info(f"🎨 Loading Custom LoRA: {os.path.basename(lora_path)}")
                if event_id: ProgressTracker.set_progress(event_id, 10, "Applying Custom Style (LoRA)...")
                try:
                    pipe.load_lora_weights(lora_path)
                    logger.info("✅ LoRA Loaded Successfully!")
                except Exception as lora_err:
                    logger.warning(f"⚠️ LoRA failed to load: {lora_err}. Using base model.")
            else:
                logger.info("ℹ️ No custom LoRA found. Using base model.")
            
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
        prize="",
        organizer="",
        event_id=None
    ):
        """
        Orchestrates the entire generation process.
        """
        logger.info(f"Generating poster for: {title}")
        
        if event_id: ProgressTracker.set_progress(event_id, 3, "Starting Engine...")
        try:
             preset = QualityPreset(quality_mode)
        except:
             preset = QualityPreset.BALANCED
        cfg = GenerationConfig.from_preset(preset)
        
        # 0. Init
        if event_id: ProgressTracker.set_progress(event_id, 5, "Initializing engine (Queue Check)...")
        gc.collect()

        # 2. Config
        try:
            preset = QualityPreset(quality_mode)
        except:
            preset = QualityPreset.BALANCED
        cfg = GenerationConfig.from_preset(preset)

        # 3. Pipeline
        pipe = self.load_pipeline(event_id)
        if event_id: ProgressTracker.set_progress(event_id, 15, "Engine Ready")

        # 4. Get Rich Prompt (Gemini)
        ai_prompt = ""
        style_data = {}
        
        if AI_AVAILABLE:
            try:
                if event_id: ProgressTracker.set_progress(event_id, 20, "Drafting AI prompt...")
                
                # Import new function
                from .ai_keyword_generator import generate_visual_design_with_ai
                
                context = f"Title: {title}. Description: {description}"
                result = generate_visual_design_with_ai(context)
                
                ai_prompt = result.prompt
                style_data = result.design_style
                
                logger.info(f"🧠 AI Prompt Used: {ai_prompt[:40]}...")
                logger.info(f"🎨 Design Style: {style_data}")
            except Exception as e:
                logger.warning(f"AI Gen failed: {e}")
                try:
                    with open("debug_styles.txt", "a") as f:
                        f.write(f"ERROR: {e}\n")
                except: 
                    pass

        # 5. Build Final Prompt
        pos, neg = PromptEngineer.build_prompt(title, aesthetic, ai_prompt, style_data, cfg=cfg)

        logger.info(f"🎨 Generating Image...")

        # 6. Inference
        # DEBUG: Write style to file to verify
        try:
            with open("debug_styles.txt", "a") as f:
                f.write(f"\n--- {title} ---\n")
                f.write(f"AI Prompt: {ai_prompt}\n")
                f.write(f"Style Data: {style_data}\n")
        except:
            pass

        print(f"\n{'='*50}")
        print(f"🎨 [IMAGE GENERATION START]")
        print(f"   - Title: {title}")
        print(f"   - Config: {cfg}")
        print(f"   - AI Prompt (Raw): {ai_prompt}")
        print(f"   - Design Style: {style_data}")
        print(f"   - Final Positive Prompt: {pos}")
        print(f"   - Final Negative Prompt: {neg}")
        print(f"{'='*50}\n")
        
        if event_id: ProgressTracker.set_progress(event_id, 40, "Generating high-res artwork (SDXL)...")
        
        with torch.inference_mode():
            img = pipe(
                prompt=pos,
                negative_prompt=neg,
                width=cfg.width,
                height=cfg.height,
                num_inference_steps=cfg.steps,    # Configurable (2-3 steps)
                guidance_scale=cfg.guidance,
            ).images[0]

        # --- REFINEMENT PASS (Quality Boost) ---
        # SKIP refinement for Cartoon/Vector style because it adds unwanted texture/noise
        is_cartoon = "cartoon" in pos.lower() or "vector" in pos.lower()
        
        if not is_cartoon:
            if event_id: ProgressTracker.set_progress(event_id, 60, "Polishing details (Refinement Pass)...")
            try:
                from diffusers import AutoPipelineForImage2Image
                refiner = AutoPipelineForImage2Image.from_pipe(pipe)
                with torch.inference_mode():
                    img = refiner(
                        prompt=pos,
                        negative_prompt=neg,
                        image=img,
                        strength=0.2,  # Low strength = subtle refinement
                        num_inference_steps=2,
                        guidance_scale=0.0,
                    ).images[0]
                logger.info("✨ Refinement pass complete!")
                del refiner
                gc.collect()
            except Exception as ref_err:
                logger.warning(f"Refinement pass failed: {ref_err}. Using base image.")
        else:
            logger.info("ℹ️ Skipping refinement for Cartoon/Vector style (keeps clean lines)")

        # 7. Render Text Overlay
        print("DEBUG: Starting TextOverlayRenderer.render...")
        if event_id: ProgressTracker.set_progress(event_id, 85, "Finalizing text overlay...")
        
        try:
            final_img = TextOverlayRenderer.render(
                img, 
                {"title": title, "date": date, "location": location, "prize": prize, "organizer": organizer},
                style_data
            )
            print("DEBUG: TextOverlayRenderer.render COMPLETE.")
        except Exception as e:
            print(f"DEBUG: TextOverlayRenderer CRASHED: {e}")
            import traceback
            traceback.print_exc()
            raise e

        # 8. Save
        output_dir = os.path.join(os.getcwd(), "static", "generated_posters")
        os.makedirs(output_dir, exist_ok=True)
        filename = f"poster_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(output_dir, filename)

        final_img.save(path, optimize=True, quality=95)

        # 9. Cleanup (AGGRESSIVE)
        print("DEBUG: Unloading Pipeline to free RAM...")
        if self.pipeline:
            del self.pipeline
            self.pipeline = None
            if torch.cuda.is_available(): [torch.cuda.empty_cache() for _ in range(2)] # Belt and suspenders
            
        gc.collect()
        gc.collect()

        return f"/static/generated_posters/{filename}"



# --- 7. QUEUE HELPER ---
QUEUE_DIR = os.path.join(os.getcwd(), "static", "queue")
os.makedirs(QUEUE_DIR, exist_ok=True)

def _update_queue_status(event_id, my_ticket_time):
    # Count how many tickets are older than mine
    try:
        current_time = time.time()
        tickets = [f for f in os.listdir(QUEUE_DIR) if f.startswith("ticket_")]
        position = 1
        for t in tickets:
            try:
                # Format: ticket_{timestamp}_{event_id}.txt
                t_parts = t.split("_")
                t_time = float(t_parts[1])
                
                # Cleanup stale tickets (> 10 mins old)
                if current_time - t_time > 600:
                    try:
                        os.remove(os.path.join(QUEUE_DIR, t))
                    except:
                        pass
                    continue # specific ticket was stale, doesn't count
                
                if t_time < my_ticket_time:
                    position += 1
            except:
                pass
        ProgressTracker.set_progress(event_id, 1, f"Waiting in queue (Pos: {position})...")
    except:
        pass

# --- 6. EXPORTED ENTRY POINT ---
def generate_event_poster(title, date, location, description, aesthetic="modern", prize="", organizer="", event_id=None):
    generator = PosterGenerator()
    
    # 1. Create Ticket
    my_time = time.time()
    ticket_path = os.path.join(QUEUE_DIR, f"ticket_{my_time}_{event_id}.txt")
    with open(ticket_path, "w") as f:
        f.write("waiting")

    def on_wait():
        _update_queue_status(event_id, my_time)

    try:
        # 2. Wait for Lock with Status Updates
        _update_queue_status(event_id, my_time) # Initial update
        with SystemFileLock("poster_gen.lock", timeout=600, on_wait=on_wait):
            
            # 3. Work
            # Delete ticket immediately upon entry so I don't count towards others' queue
            if os.path.exists(ticket_path):
                os.remove(ticket_path)
                
            return generator.generate(title, date, location, description, aesthetic, quality_mode="quality", prize=prize, organizer=organizer, event_id=event_id)
            
    except RuntimeError as e:
        if "alloc" in str(e).lower() or "memory" in str(e).lower():
             logger.error(f"OOM Error: {e}")
             if event_id: ProgressTracker.set_progress(event_id, 0, "Error: Server Out of RAM. Try 'Balanced' mode.")
             gc.collect()
             raise RuntimeError("Server Out of RAM")
        raise e
    finally:
        # Ensure ticket is gone even if crash
        if os.path.exists(ticket_path):
            try:
                os.remove(ticket_path)
            except:
                pass
