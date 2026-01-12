import pandas as pd
import io
from PIL import Image
import os

def filter_people_from_parquet(input_files, output_file):
    """
    Filter out images with people from parquet files based on caption analysis.
    """
    # Keywords that indicate people in captions
    people_keywords = [
        'person', 'people', 'man', 'woman', 'men', 'women', 'human', 'face', 'faces',
        'crowd', 'audience', 'character', 'boy', 'girl', 'child', 'children',
        'actor', 'actress', 'player', 'team', 'portrait', 'selfie', 'group',
        'hand', 'hands', 'finger', 'fingers', 'arm', 'arms', 'leg', 'legs',
        'body', 'figure', 'silhouette', 'standing', 'sitting', 'walking'
    ]
    
    all_data = []
    total_images = 0
    filtered_images = 0
    
    # Load all parquet files
    for file in input_files:
        if os.path.exists(file):
            print(f"Loading {file}...")
            df = pd.read_parquet(file)
            all_data.append(df)
            total_images += len(df)
        else:
            print(f"Warning: {file} not found, skipping...")
    
    if not all_data:
        print("No data loaded!")
        return
    
    # Combine all data
    combined_df = pd.concat(all_data, ignore_index=True)
    print(f"\nTotal images loaded: {total_images}")
    
    # Filter based on captions
    def contains_people(caption):
        if pd.isna(caption):
            return False
        caption_lower = str(caption).lower()
        return any(keyword in caption_lower for keyword in people_keywords)
    
    # Create filtered dataset
    filtered_df = combined_df[~combined_df['caption'].apply(contains_people)]
    filtered_images = len(filtered_df)
    
    print(f"Images after filtering: {filtered_images}")
    print(f"Images removed: {total_images - filtered_images} ({100 * (total_images - filtered_images) / total_images:.1f}%)")
    
    # Save filtered data
    filtered_df.to_parquet(output_file, index=False)
    print(f"\nFiltered dataset saved to: {output_file}")
    
    # Show some sample captions from filtered data
    print("\n--- Sample captions from filtered dataset ---")
    for i, caption in enumerate(filtered_df['caption'].head(10)):
        print(f"{i+1}. {caption[:100]}...")

if __name__ == "__main__":
    input_files = [
        "train-00000-of-00094.parquet",
        "train-00001-of-00094.parquet"
    ]
    
    output_file = "train_filtered_no_people.parquet"
    
    print("=" * 60)
    print("FILTERING TRAINING DATA - REMOVING IMAGES WITH PEOPLE")
    print("=" * 60)
    
    filter_people_from_parquet(input_files, output_file)
    
    print("\n" + "=" * 60)
    print("NEXT STEP:")
    print("Run training with filtered data:")
    print("python train_poster_lora.py --parquet_files train_filtered_no_people.parquet --max_train_samples 2000 --num_train_epochs 3")
    print("=" * 60)
