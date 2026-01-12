import pandas as pd
import os

# --- Configuration ---
PARQUET_PATH = "metadata.parquet"
IMAGE_DIR = "dataset/images"
CAPTION_DIR = "dataset/captions"

# --- Main Execution ---
def main():
    if not os.path.exists(IMAGE_DIR):
        print(f"❌ Error: Image directory not found: {IMAGE_DIR}")
        return

    os.makedirs(CAPTION_DIR, exist_ok=True)

    print("1. Loading Parquet metadata...")
    df = pd.read_parquet(PARQUET_PATH)
    
    # Normalize columns
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Verify columns exist
    if 'image_name' not in df.columns or 'prompt' not in df.columns:
        print(f"❌ Columns missing. Found: {df.columns}")
        return

    # Clean empty prompts
    df = df.dropna(subset=['prompt'])
    df = df[df['prompt'].astype(str).str.strip() != ""]

    print("2. Scanning image directory...")
    # Get all files from disk
    files_on_disk = os.listdir(IMAGE_DIR)
    
    if not files_on_disk:
        print("❌ No images found in dataset/images folder.")
        return

    # Create a dictionary mapping: { 'filename_without_extension' : 'full_filename' }
    # This fixes the mismatch issue.
    # Example: { '3ccdc650' : '3ccdc650.webp' }
    disk_image_map = {os.path.splitext(f)[0]: f for f in files_on_disk}
    
    print(f"   Found {len(disk_image_map)} images on disk.")

    print("3. Matching Metadata to Images...")
    
    # Extract just the filename ID (stem) from the parquet 'image_name' column
    # '3ccdc650.webp' -> '3ccdc650'
    df['image_id'] = df['image_name'].astype(str).apply(lambda x: os.path.splitext(os.path.basename(x.strip()))[0])

    # Filter: Keep only rows where the image_id exists in our disk map
    initial_count = len(df)
    df = df[df['image_id'].isin(disk_image_map.keys())]
    final_count = len(df)
    
    print(f"   Matched {final_count} metadata entries to existing images.")
    print(f"   (Skipped {initial_count - final_count} missing entries)")

    if final_count == 0:
        print("❌ No matches found. Check if your Parquet IDs match your Image filenames.")
        # Debug print to help you verify
        print(f"   Example Disk ID: {list(disk_image_map.keys())[0]}")
        print(f"   Example Parquet ID: {df.iloc[0]['image_id'] if len(df) > 0 else 'N/A'}")
        return

    print("4. Writing Caption files...")
    success_count = 0
    
    # Iterate and write
    for image_id, prompt in zip(df['image_id'], df['prompt']):
        # We use the same name as the image ID for the text file
        txt_name = f"{image_id}.txt"
        txt_path = os.path.join(CAPTION_DIR, txt_name)
        
        try:
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(prompt.strip())
            success_count += 1
            
            # Optional: Print progress every 10,000 files
            if success_count % 10000 == 0:
                print(f"   Processed {success_count}...")
                
        except Exception as e:
            print(f"❌ Failed to write {txt_name}: {e}")

    print(f"✅ DONE! Successfully created {success_count} caption files in '{CAPTION_DIR}'.")

if __name__ == "__main__":
    main()