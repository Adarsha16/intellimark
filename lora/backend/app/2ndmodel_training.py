from PIL import Image, ImageDraw, ImageFont
import io

def overlay_event_details(image_bytes, title, date_text, location_text):
    # Load the AI generated image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    width, height = img.size

    # Load a font (Ensure you have a .ttf file in your folder, like Arial or Roboto)
    # If on Windows: "arial.ttf". If on Linux: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        title_font = ImageFont.truetype("arial.ttf", 40)
        sub_font = ImageFont.truetype("arial.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    # Create a semi-transparent black overlay at the bottom for readability
    overlay = Image.new('RGBA', img.size, (0,0,0,0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle([0, height-120, width, height], fill=(0, 0, 0, 160)) # Dark box
    
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # Draw Title
    draw.text((30, height - 100), title, font=title_font, fill="white")
    # Draw Date & Location
    draw.text((30, height - 50), f"{date_text} | {location_text}", font=sub_font, fill="yellow")

    # Convert back to RGB for saving
    final_img = img.convert("RGB")
    return final_img