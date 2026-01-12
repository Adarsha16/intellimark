
import os
import torch
import io
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, StableDiffusionInpaintPipeline, DPMSolverMultistepScheduler
from peft import PeftModel, PeftConfig
from rembg import remove
import google.generativeai as genai

# --- CONFIG ---
# PLEASE ENTER YOUR GEMINI API KEY HERE
GEMINI_API_KEY = "AIzaSyBdDpQxWi5mvfCBc558nyrWtpQuF4YpG24" 

# Fix: Logic to configure API key correctly.
# We check if the key is valid (longer than placeholder) and not the placeholder itself.
if len(GEMINI_API_KEY) > 20 and "AIzaSyBdDpQxWi5mvfCBc558nyrWtpQuF4YpG24" not in GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to configure Gemini. {e}")

class PosterGenerator:
    def __init__(self, model_id="runwayml/stable-diffusion-v1-5", lora_path="lora_poster_final"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = model_id
        self.lora_path = lora_path
        self.txt2img_pipe = None
        self.inpaint_pipe = None 
        self._load_models()

    def _load_models(self):
        print(f"Loading base model {self.model_id} on {self.device}...")
        # 1. Load txt2img pipeline (Base) - SD 1.5
        self.txt2img_pipe = StableDiffusionPipeline.from_pretrained(
            self.model_id, 
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            safety_checker=None
        ).to(self.device)
        
        # Use DPM Scheduler for better quality
        self.txt2img_pipe.scheduler = DPMSolverMultistepScheduler.from_config(self.txt2img_pipe.scheduler.config)

        # Apply LoRA if available (RE-ENABLED)
        if os.path.exists(self.lora_path):
            print(f"Loading LoRA weights from {self.lora_path}...")
            try:
                self.txt2img_pipe.unet = PeftModel.from_pretrained(self.txt2img_pipe.unet, self.lora_path)
                self.txt2img_pipe.unet.to(self.device)
            except Exception as e:
                print(f"Failed to load LoRA: {e}")
        else:
            print("LoRA weights not found, using base model.")

        # 2. Inpaint Pipeline (Share components to save VRAM)
        self.inpaint_pipe = StableDiffusionInpaintPipeline(
            vae=self.txt2img_pipe.vae,
            text_encoder=self.txt2img_pipe.text_encoder,
            tokenizer=self.txt2img_pipe.tokenizer,
            unet=self.txt2img_pipe.unet,
            scheduler=self.txt2img_pipe.scheduler,
            safety_checker=None,
            feature_extractor=None
        ).to(self.device)

    def enhance_prompt(self, user_prompt, image_context=None):
        """
        Uses Gemini to improve the prompt for Stable Diffusion.
        """
        # Simplified check: valid if length > 20 and doesn't contain "YOUR_API_KEY"
        if len(GEMINI_API_KEY) < 20 or "AIzaSyBdDpQxWi5mvfCBc558nyrWtpQuF4YpG2" in GEMINI_API_KEY:
            print("Gemini API Key not set properly. Using original prompt.")
            return user_prompt
            
        print("Enhancing prompt with Gemini...")
        # Switch to gemini-pro as 1.5-flash gave 404 for this user
        model = genai.GenerativeModel('gemini-pro')
        
        system_instruction = (
            "You are an expert prompt engineer for Stable Diffusion. "
            "Convert the user request into a highly detailed, artistic description. "
            "IMPORTANT RULES: "
            "1. The output must purely describe the visual scene context (objects, atmosphere, lighting). "
            "2. STRICTLY FORBIDDEN: Do not ask for text, words, letters, signage, logos, or typography. "
            "3. STRICTLY FORBIDDEN: Do not ask for humans, people, faces, men, women, crowds, or characters. "
            "4. Focus on the inanimate objects, environment, food, nature, or abstract elements. "
            "5. Enforce 8k resolution, photorealism, and cinematic lighting. "
            "6. Output ONLY the prompt string."
        )
        
        try:
            response = model.generate_content(f"{system_instruction}\n\nUser Request: {user_prompt}\n\nEnhanced Prompt:")
            enhanced = response.text.strip()
            print(f"Original: {user_prompt}\nEnhanced: {enhanced}")
            return enhanced
        except Exception as e:
            print(f"Gemini enhancement failed: {e}")
            # Fallback: Add quality keywords manually
            return user_prompt + ", masterpiece, best quality, 8k, highly detailed, no text, no people, objects only"

    def generate(self, prompt, input_image=None, width=768, height=1024, steps=50, guidance_scale=12.0, strength=0.75):
        # 1. Enhance Prompt using Gemini
        prompt = self.enhance_prompt(prompt)
        
        # Add explicit "no text" to the positive prompt
        prompt = prompt + ", no text, no letters, no words, clean image, text-free"

        # MAXIMUM STRENGTH negative prompt against text AND PEOPLE
        negative_prompt = (
            "text, watermark, writing, blurry, low quality, distorted, ugly, bad anatomy,hands, feet "
            "font, letters, alphabet, signage, logo, signature, username, error, glitch, words, "
            "branding, title, heading, people, man, woman, men, women, human, face, person, "
            "crowd, audience, character, boy, girl, self-portrait, hands, fingers, arms, legs, body parts, "
            "typography, calligraphy, script, inscription, label, caption, subtitle, banner, poster text, "
            "sign, billboard, placard, notice, advertisement text, menu text, book, newspaper, magazine, "
            "document, paper with text, written language, characters, symbols, numbers, digits"
        )
        
        if input_image:
           # SMART INTEGRATION: Use RemBG + Inpainting
           print("Running Smart Integration (RemBG + Inpaint)...")
           
           # 1. Remove Background FIRST
           subject_rgba = remove(input_image)
           
           # 2. Crop to Content
           bbox = subject_rgba.getbbox()
           if bbox:
               subject_rgba = subject_rgba.crop(bbox)
               print(f"Cropped subject to {subject_rgba.size}")
           
           # 3. Intelligent Resize & Placement
           target_w, target_h = width, height
           scale_w = (target_w * 0.85) / subject_rgba.width
           scale_h = (target_h * 0.85) / subject_rgba.height
           scale = min(scale_w, scale_h) 
           
           new_w = int(subject_rgba.width * scale)
           new_h = int(subject_rgba.height * scale)
           
           subject_rgba = subject_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)
           
           # 4. Paste onto Canvas
           comp_image = Image.new("RGB", (target_w, target_h), (0,0,0)) 
           offset_x = (target_w - new_w) // 2
           offset_y = (target_h - new_h) // 2 
           
           full_rgba = Image.new("RGBA", (target_w, target_h), (0,0,0,0))
           full_rgba.paste(subject_rgba, (offset_x, offset_y)) 
           
           alpha = full_rgba.split()[3]
           mask = ImageOps.invert(alpha)
           
           comp_image.paste(subject_rgba, (offset_x, offset_y), mask=subject_rgba.split()[3])
           
           result = self.inpaint_pipe(
               prompt=prompt,
               image=comp_image,
               mask_image=mask,
               num_inference_steps=steps,
               guidance_scale=guidance_scale,
               negative_prompt=negative_prompt
           ).images[0]
           
        else:
            print("Running txt2img...")
            result = self.txt2img_pipe(
                prompt=prompt,
                height=height,
                width=width,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                negative_prompt=negative_prompt
            ).images[0]
            
        return result

    def overlay_text(self, image, title, subtitle=None, footer=None):
        """
        Overlay text on the image.
        """
        img = image.convert("RGBA")
        width, height = img.size

        # Fonts
        try:
            font_path = "arial.ttf"
            title_font = ImageFont.truetype(font_path, int(height * 0.08)) 
            sub_font = ImageFont.truetype(font_path, int(height * 0.04))
            footer_font = ImageFont.truetype(font_path, int(height * 0.03))
        except IOError:
            title_font = ImageFont.load_default()
            sub_font = ImageFont.load_default()
            footer_font = ImageFont.load_default()

        # Dark Gradient at bottom
        overlay = Image.new('RGBA', img.size, (0,0,0,0))
        d = ImageDraw.Draw(overlay)
        box_height = int(height * 0.3)
        d.rectangle([0, height - box_height, width, height], fill=(0, 0, 0, 160))
        
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)
        
        def get_text_w(text, font):
            if hasattr(draw, 'textbbox'):
                 bbox = draw.textbbox((0, 0), text, font=font)
                 return bbox[2] - bbox[0]
            else:
                 return draw.textlength(text, font=font)

        # Title
        title_w = get_text_w(title.upper(), title_font)
        draw.text(((width - title_w) / 2, height - box_height + 20), title.upper(), font=title_font, fill="white")

        # Subtitle
        if subtitle:
            sub_w = get_text_w(subtitle, sub_font)
            draw.text(((width - sub_w) / 2, height - box_height + 20 + int(height*0.09)), subtitle, font=sub_font, fill="#FFD700") 

        # Footer
        if footer:
            foot_w = get_text_w(footer, footer_font)
            draw.text(((width - foot_w) / 2, height - 30), footer, font=footer_font, fill="#CCCCCC")

        return img.convert("RGB")

if __name__ == "__main__":
    generator = PosterGenerator()
    
    # User Input Prompt (Simple)
    user_prompt = "gamming event"
    print(f"User Input: {user_prompt}")
    
    # Generate image WITHOUT text overlay
    print("Generating Poster (Text-to-Image)...")
    
    try:
        # Standard Text-to-Image generation
        img = generator.generate(user_prompt)
        
        # Save the raw image WITHOUT text overlay
        img.save("demo_poster_no_text.jpg")
        print("Saved demo_poster_no_text.jpg (no text overlay)")
        
        # Also save version WITH text overlay for comparison
        final_poster = generator.overlay_text(img, "LEGENDS RISE", "Grand Tournament Final")
        final_poster.save("demo_poster_with_text.jpg")
        print("Saved demo_poster_with_text.jpg (with text overlay)")
    except Exception as e:
        print(f"Could not generate poster: {e}")
