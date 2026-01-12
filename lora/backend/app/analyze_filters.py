import pandas as pd
import os

parquet_files = [
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00000-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00001-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00002-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00003-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00004-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00005-of-00094.parquet',
    r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00006-of-00094.parquet'
    
]

negative_words = [
    "text", "watermark", "writing", "blurry", "low quality", "distorted", "ugly", "bad anatomy", "hands", "feet",
    "font", "letters", "alphabet", "signage", "logo", "signature", "username", "error", "glitch", "words",
    "branding", "title", "heading", "people", "man", "woman", "men", "women", "human", "face", "person",
    "crowd", "audience", "boy", "girl", "self-portrait", "fingers", "arms", "legs", "body parts",
    "typography", "calligraphy", "script", "inscription", "label", "caption", "subtitle", "banner", "poster text",
    "sign", "billboard", "placard", "notice", "advertisement text", "menu text", "book", "newspaper", "magazine",
    "document", "paper with text", "written language", "characters", "symbols", "numbers", "digits"
]

for file in parquet_files:
    if os.path.exists(file):
        print(f"\nAnalyzing file: {file}")
        df = pd.read_parquet(file)
        print(f"Total rows: {len(df)}")
        
        # Check which words are hitting the most
        hits = {}
        for word in negative_words:
            count = df['caption'].str.contains(word, case=False).sum()
            if count > 0:
                hits[word] = count
        
        print("Top Filter Hits:")
        for word, count in sorted(hits.items(), key=lambda x: x[1], reverse=True)[:15]:
            print(f"  '{word}': {count}")
            
        print("\nSample captions that were filtered out:")
        filtered_df = df[df['caption'].str.contains('|'.join(negative_words), case=False, na=False)]
        for caption in filtered_df['caption'].head(5):
            print(f"- {caption[:150]}")
    else:
        print(f"File not found: {file}")
