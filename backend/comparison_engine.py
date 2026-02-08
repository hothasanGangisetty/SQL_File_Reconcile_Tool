import pandas as pd
import numpy as np
import re
from datetime import date, datetime


def normalize_series_for_comparison(s):
    """Normalize a pandas Series values so that equivalent values compare equal.
    
    Handles:
    - datetime.date vs datetime.datetime (2025-11-01 vs 2025-11-01 00:00:00)
    - String representations of dates with trailing 00:00:00
    - Numeric precision (1750.0 vs 1750, trailing zeros)
    - Whitespace trimming
    - NaN/None placeholders
    """
    def norm(val):
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return '__NULL__'
        
        # Convert to string first
        s_val = str(val).strip()
        
        # Empty / nan / None strings
        if s_val in ('', 'None', 'nan', 'NaT', 'NaN'):
            return '__NULL__'
        
        # Date/datetime normalization:
        # Remove trailing " 00:00:00" or " 00:00:00.000000" (midnight time component)
        s_val = re.sub(r'\s+00:00:00(\.\d+)?$', '', s_val)
        
        # Also handle "Sat, 01 Nov 2025 00:00:00 GMT" style dates
        # Try parsing various date formats and normalize to YYYY-MM-DD
        if re.match(r'^\d{4}-\d{2}-\d{2}$', s_val):
            return s_val  # Already clean date
        
        # Numeric normalization: remove meaningless trailing zeros
        # "1750.50" -> "1750.5", "1750.0" -> "1750"
        try:
            num = float(s_val)
            if num == int(num):
                return str(int(num))
            else:
                # Remove trailing zeros: 1750.50 -> 1750.5
                return f"{num:g}"
        except (ValueError, OverflowError):
            pass
        
        return s_val
    
    return s.map(norm)


def _clean_display_value(val):
    """Clean a value for display — strip midnight timestamps, tidy numbers."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return ''
    s = str(val).strip()
    if s in ('None', 'nan', 'NaT', 'NaN', ''):
        return ''
    # Remove trailing midnight: "2025-11-01 00:00:00" -> "2025-11-01"
    s = re.sub(r'\s+00:00:00(\.\d+)?$', '', s)
    return s


def transform_to_pre_post(diff_df, key_cols, common_cols):
    """Transform side-by-side _sql/_file columns into stacked pre/post rows.
    
    For Mismatches: 2 rows (pre=SQL values, post=File values)
    For Only in SQL: 1 row (pre)
    For Only in File: 1 row (post)
    """
    rows = []
    
    for _, row in diff_df.iterrows():
        status = row.get('status', '')
        
        # Identify which columns have value mismatches (using same normalization)
        mismatch_cols = []
        if status == 'Mismatch':
            for col in common_cols:
                raw_sql = row.get(f'{col}_sql', '__NA__')
                raw_file = row.get(f'{col}_file', '__NA__')
                n1 = normalize_series_for_comparison(pd.Series([raw_sql])).iloc[0]
                n2 = normalize_series_for_comparison(pd.Series([raw_file])).iloc[0]
                if n1 != n2:
                    mismatch_cols.append(col)
        
        mismatch_str = ','.join(mismatch_cols)
        
        # PRE row (SQL values) for Mismatch and Only-in-SQL
        if status in ('Mismatch', 'Only in SQL'):
            pre = {k: row.get(k, '') for k in key_cols}
            for col in common_cols:
                raw = row.get(f'{col}_sql', row.get(col, ''))
                pre[col] = _clean_display_value(raw)
            pre['pre/post'] = 'pre'
            pre['status'] = status
            pre['_mismatch_cols'] = mismatch_str
            rows.append(pre)
        
        # POST row (File values) for Mismatch and Only-in-File
        if status in ('Mismatch', 'Only in File'):
            post = {k: row.get(k, '') for k in key_cols}
            for col in common_cols:
                raw = row.get(f'{col}_file', row.get(col, ''))
                post[col] = _clean_display_value(raw)
            post['pre/post'] = 'post'
            post['status'] = status
            post['_mismatch_cols'] = mismatch_str
            rows.append(post)
    
    if not rows:
        return pd.DataFrame(columns=key_cols + common_cols + ['pre/post', 'status', '_mismatch_cols'])
    
    result = pd.DataFrame(rows)
    ordered = [c for c in key_cols + common_cols + ['pre/post', 'status', '_mismatch_cols'] if c in result.columns]
    return result[ordered]


def run_hybrid_comparison(df_sql, df_file, keys=None):
    """
    Performs a hybrid comparison between two DataFrames.
    
    Args:
        df_sql (pd.DataFrame): The 'Pre' dataset (Source of Truth/Database).
        df_file (pd.DataFrame): The 'Post' dataset (File Verification).
        keys (list): List of column names to use as primary keys. 
                     If None or empty, performs Sequential (Index-based) comparison.
                     
    Returns:
        dict: Summary statistics and a subset of the result for preview.
              (Full result should be cached).
    """
    
    # 1. Standardization
    # Normalize Keys to Strings to prevent Type Mismatches (e.g. 101 (int) vs "101" (str))
    if keys:
        for key in keys:
            if key in df_sql.columns:
                df_sql[key] = df_sql[key].astype(str).str.strip()
            if key in df_file.columns:
                df_file[key] = df_file[key].astype(str).str.strip()

    # 2. Determine Merge Strategy
    if not keys or len(keys) == 0:
        # Strategy B: Sequential Comparison
        # We rely on the row order.
        print("Sequential Comparison Active")
        
        # Reset Index to ensure 0..N alignment
        df_sql = df_sql.reset_index(drop=True)
        df_file = df_file.reset_index(drop=True)
        
        # We merge on the synthetic index
        # suffices: _sql (Left/Yellow), _file (Right/Red)
        merged_df = pd.merge(df_sql, df_file, left_index=True, right_index=True, how='outer', suffixes=('_sql', '_file'), indicator=True)
        
        # Add explicit Row# column for display
        merged_df.insert(0, 'Row#', range(1, len(merged_df) + 1))
        key_cols = ['Row#']
        
    else:
        # Strategy A: Key-Based Comparison
        print(f"Key-Based Comparison Active: {keys}")
        
        # Ensure keys exist in both
        # TODO: Error handling if keys don't exist
        
        merged_df = pd.merge(df_sql, df_file, on=keys, how='outer', suffixes=('_sql', '_file'), indicator=True)
        key_cols = keys

    # 3. Analyze Results (Vectorized)
    
    # '_merge' column values: 'left_only' (SQL only), 'right_only' (File only), 'both'
    
    # We need to find Value Mismatches in rows that exist in 'both'.
    # For every non-key column, check if col_sql != col_file
    
    # Identify non-key columns (common columns)
    # The merge operation handles suffixes automatically for overlapping columns.
    # We need to find the base column names that were common.
    common_cols = [c for c in df_sql.columns if c in df_file.columns and c not in (keys if keys else [])]
    
    # Initialize a 'mismatch' flag column
    merged_df['has_mismatch'] = False
    
    for col in common_cols:
        col_sql = f"{col}_sql"
        col_file = f"{col}_file"
        
        # Only compare rows where both exist
        mask_both = merged_df['_merge'] == 'both'
        
        # Normalize both sides for smart comparison
        # This handles: date vs datetime, numeric precision, whitespace, NaN
        s1 = normalize_series_for_comparison(merged_df.loc[mask_both, col_sql])
        s2 = normalize_series_for_comparison(merged_df.loc[mask_both, col_file])
        
        mask_diff = s1 != s2
        
        # Mark the global mismatch row
        merged_df.loc[mask_both & mask_diff, 'has_mismatch'] = True

    # 4. Filter Results for Display
    # User wants: "Only display rows where _pre != _post (Mismatches) or NaN (Missing)."
    # So we filter for:
    # 1. _merge == 'left_only' (Missing in file)
    # 2. _merge == 'right_only' (Missing in SQL)
    # 3. has_mismatch == True (Value difference)
    
    final_diff_view = merged_df[
        (merged_df['_merge'] != 'both') | (merged_df['has_mismatch'] == True)
    ].copy()
    
    # Rename _merge for clarity
    status_map = {
        'left_only': 'Only in SQL',
        'right_only': 'Only in File',
        'both': 'Mismatch' # Since we filtered OUT match-both, remaining 'both' implies mismatch
    }
    final_diff_view['status'] = final_diff_view['_merge'].map(status_map)
    
    # Drop the technical '_merge' column
    final_diff_view.drop(columns=['_merge'], inplace=True, errors='ignore')
    
    # 5. Return Summary
    summary = {
        "total_sql_rows": len(df_sql),
        "total_file_rows": len(df_file),
        "total_discrepancies": len(final_diff_view),
        "mismatches": len(final_diff_view[final_diff_view['status'] == 'Mismatch']),
        "only_on_sql": len(final_diff_view[final_diff_view['status'] == 'Only in SQL']),
        "only_on_file": len(final_diff_view[final_diff_view['status'] == 'Only in File']),
        "key_cols": key_cols,
        "common_cols": common_cols
    }
    
    # Transform to pre/post stacked format for display
    pre_post_df = transform_to_pre_post(final_diff_view, key_cols, common_cols)
    
    return pre_post_df, summary
