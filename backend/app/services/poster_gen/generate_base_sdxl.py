import torch
import os
import uuid
import logging
import re
from PIL import Image, ImageDraw, ImageFont
from diffusers import (
    StableDiffusionXLPipeline,
    UNet2DConditionModel,
    EulerDiscreteScheduler,
)
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

# Attempt to import AI generator, fallback if missing
try:
    from .ai_keyword_generator import generate_visual_keywords_with_ai
except ImportError:
    generate_visual_keywords_with_ai = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- GLOBAL MODEL CACHE ---
# We store the model in a global variable so we don't reload 6GB of data every request
_pipe = None


def get_font(size):
    """Cross-platform font loading."""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in font_paths:
        try:
            return ImageFont.truetype(path, size=size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def target_size(aspect_ratio="4:5", base_long_side=1024):
    """Calculate dimensions divisible by 8."""
    if aspect_ratio == "1:1":
        return 1024, 1024
    if aspect_ratio == "16:9":
        return 1024, 576
    return 816, 1024  # Default 4:5ish


def load_sdxl_lightning_pipe(device: str, steps=4):
    """Loads the model config."""
    base_model = "stabilityai/stable-diffusion-xl-base-1.0"
    lightning_repo = "ByteDance/SDXL-Lightning"
    ckpt_name = "sdxl_lightning_4step_unet.safetensors"  # Hardcoding 4 step for speed

    use_cuda = device == "cuda"
    dtype = torch.float16 if use_cuda else torch.float32

    # 1. Load UNet
    unet = UNet2DConditionModel.from_config(base_model, subfolder="unet")
    unet.to(device=device, dtype=dtype)

    unet_path = hf_hub_download(lightning_repo, ckpt_name)
    unet_state = load_file(unet_path, device=device)
    unet.load_state_dict(unet_state)

    # 2. Load Pipeline
    pipe = StableDiffusionXLPipeline.from_pretrained(
        base_model,
        unet=unet,
        torch_dtype=dtype,
        use_safetensors=True,
        variant="fp16" if use_cuda else None,
    ).to(device)

    # 3. Scheduler
    pipe.scheduler = EulerDiscreteScheduler.from_config(
        pipe.scheduler.config, timestep_spacing="trailing"
    )
    return pipe


def get_pipe():
    """Singleton pattern to load model once."""
    global _pipe
    if _pipe is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"⏳ Loading SDXL-Lightning on {device}...")
        _pipe = load_sdxl_lightning_pipe(device, steps=4)
    return _pipe


def render_text_overlay(img: Image.Image, info: dict):
    """Draws text on the image based on event info."""
    W, H = img.size
    img = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Fonts
    font_title = get_font(max(40, W // 14))
    font_meta = get_font(max(20, W // 30))

    # Dark Backdrop at bottom
    backdrop_h = int(H * 0.25)
    draw.rectangle([0, H - backdrop_h, W, H], fill=(0, 0, 0, 180))

    # Text Logic
    margin = 40
    y_pos = H - backdrop_h + 30

    # Title
    draw.text(
        (margin, y_pos),
        info.get("title", "Event").upper(),
        font=font_title,
        fill="white",
    )
    y_pos += font_title.size + 10

    # Meta Data
    meta_text = f"{info.get('date', '')}  |  {info.get('location', '')}"
    draw.text((margin, y_pos), meta_text, font=font_meta, fill="#CCCCCC")

    return Image.alpha_composite(img, overlay).convert("RGB")


# --- MAIN EXPORTED FUNCTION ---
def generate_event_poster(
    title: str, date: str, location: str, description: str, aesthetic: str = "modern"
) -> str:
    """
    Main function called by FastAPI.
    Returns: Relative URL path to the generated image.
    """
    pipe = get_pipe()
    device = pipe.device

    # 1. AI Keywords (Optional)
    keywords = ""
    if generate_visual_keywords_with_ai:
        try:
            keywords = generate_visual_keywords_with_ai(f"{title} - {description}")
        except Exception as e:
            logger.warning(f"AI Keyword Gen failed: {e}")

    # 2. Construct Prompt
    # We combine the logic from your old extract_lines_from_prompt here
    base_prompt = (
        f"professional event poster for {title}, {aesthetic} style, {keywords}"
    )
    positive_prompt = f"{base_prompt}, high quality, 4k, no text, no letters"
    negative_prompt = "text, letters, watermark, blurry, low quality, distorted, ugly"

    # 3. Generate Image
    w, h = 816, 1024  # Approx 4:5
    logger.info(f"🎨 Generating: {positive_prompt}")

    # Random seed
    g = torch.Generator(device=device).manual_seed(
        torch.randint(0, 1000000, (1,)).item()
    )

    image = pipe(
        prompt=positive_prompt,
        negative_prompt=negative_prompt,
        width=w,
        height=h,
        num_inference_steps=4,  # Lightning is fast!
        guidance_scale=0.0,  # Lightning needs 0 guidance often
        generator=g,
    ).images[0]

    # 4. Text Overlay
    info = {"title": title, "date": str(date), "location": location}
    final_image = render_text_overlay(image, info)

    # 5. Save
    filename = f"poster_{uuid.uuid4().hex}.png"
    save_dir = os.path.join("static", "generated_posters")
    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, filename)
    final_image.save(save_path)

    logger.info(f"✅ Saved to {save_path}")
    return f"/static/generated_posters/{filename}"
