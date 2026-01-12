import pandas as pd
import os

path = r'c:\Users\prana\OneDrive\Desktop\intellimark\aishit\backend\app\train-00000-of-00094.parquet'
if os.path.exists(path):
    df = pd.read_parquet(path)
    print("Columns:", df.columns.tolist())
    print("Row count:", len(df))
    print("Head image type:", type(df['image'].iloc[0]))
    print("Caption example:", df['caption'].iloc[0][:100])
else:
    print(f"File not found: {path}")
