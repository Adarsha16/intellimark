import sys
try:
    import pandas as pd
    df = pd.read_parquet(r'c:\Users\prana\OneDrive\Desktop\project\aishit\backend\app\train-00001-of-00094.parquet')
    print("Columns:", df.columns.tolist())
    print("First row:", df.iloc[0])
except ImportError:
    print("Pandas not found, trying pyarrow")
    import pyarrow.parquet as pq
    table = pq.read_table(r'c:\Users\prana\OneDrive\Desktop\project\aishit\backend\app\train-00001-of-00094.parquet')
    print("Columns:", table.column_names)
    print("First row schema:", table.schema)
except Exception as e:
    print(f"Error: {e}")
