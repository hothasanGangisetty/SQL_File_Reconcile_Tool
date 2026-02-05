import pandas as pd
import os
import shutil
import glob

# distinct cache directories
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'temp_cache')
UPLOADS_DIR = os.path.join(CACHE_DIR, 'uploads')
RESULTS_DIR = os.path.join(CACHE_DIR, 'results')

def init_cache():
    """Ensures cache directories exist."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)

def clear_cache():
    """Clears the temp_cache directory."""
    try:
        if os.path.exists(CACHE_DIR):
            shutil.rmtree(CACHE_DIR)
        init_cache()
    except Exception as e:
        print(f"Error clearing cache: {e}")

def save_df(df, category, file_id):
    """
    Saves a DataFrame to Parquet.
    category: 'uploads' or 'results'
    """
    if category == 'uploads':
        path = os.path.join(UPLOADS_DIR, f"{file_id}.parquet")
    else:
        path = os.path.join(RESULTS_DIR, f"{file_id}.parquet")
    
    # Fix mixed-type columns that crash PyArrow.
    # Excel files often produce 'object' dtype columns with mixed datetime/string/None values.
    # Convert any 'object' column to string to guarantee Parquet compatibility.
    df_safe = df.copy()
    for col in df_safe.columns:
        if df_safe[col].dtype == 'object':
            df_safe[col] = df_safe[col].astype(str).replace('None', '').replace('nan', '')
        elif pd.api.types.is_datetime64_any_dtype(df_safe[col]):
            df_safe[col] = df_safe[col].astype(str).replace('NaT', '')
    
    df_safe.to_parquet(path, index=False)
    return path

def load_df(category, file_id):
    """
    Loads a DataFrame from Parquet.
    Returns None if not found.
    """
    if category == 'uploads':
        path = os.path.join(UPLOADS_DIR, f"{file_id}.parquet")
    else:
        path = os.path.join(RESULTS_DIR, f"{file_id}.parquet")
    
    if not os.path.exists(path):
        return None
        
    return pd.read_parquet(path)

# Initialize on import
init_cache()
