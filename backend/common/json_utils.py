"""
Safe JSON Serialization Layer  (Flask 3.x + Pandas 3.x compatible)

Problem  : Flask 3.x ignores app.json_encoder.  Pandas 3.x df.fillna("")
           raises TypeError on datetime64 columns.  pd.isna() on NaT-like
           objects calls .timetuple() which crashes.
Solution : Convert every cell BEFORE json.dumps, then use our own
           safe_jsonify() with default=str as ultimate fallback.
"""

from flask import Response
import pandas as pd
import numpy as np
import json
import datetime
import decimal


def _safe_val(v):
    """Convert ONE value to a JSON-native primitive.

    Returns str/int/float/bool or '' for nulls.
    NaT is checked BEFORE pd.isna() to avoid timetuple crash.
    """
    # ---- None / NaN / NaT  (order matters!) ----
    if v is None:
        return ''
    if v is pd.NaT:
        return ''
    if isinstance(v, float):
        if np.isnan(v) or np.isinf(v):
            return ''
        return v
    if isinstance(v, (np.floating,)):
        f = float(v)
        if np.isnan(f) or np.isinf(f):
            return ''
        return f
    try:
        if pd.isna(v):
            return ''
    except (TypeError, ValueError):
        pass

    # ---- Temporal types  (must be before generic str check) ----
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if isinstance(v, datetime.datetime):       # before date (subclass)
        return v.isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, datetime.time):
        return v.isoformat()
    if isinstance(v, (datetime.timedelta, pd.Timedelta)):
        return str(v)

    # ---- Numeric / numpy ----
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, decimal.Decimal):
        f = float(v)
        return int(f) if f == int(f) else f

    # ---- Binary ----
    if isinstance(v, (bytes, bytearray, memoryview)):
        return str(v)

    # ---- String-ish null sentinels ----
    if isinstance(v, str) and v.strip().lower() in ('none', 'nat', 'nan', '<na>'):
        return ''

    return v


def sanitize_df_for_json(df):
    """Make every cell in a DataFrame safe for json.dumps.

    Replaces `df.fillna("")` + handles typed columns that fillna crashes on.
    Processes ALL columns regardless of dtype.
    """
    df = df.copy()
    for col in df.columns:
        df[col] = df[col].map(_safe_val)
    return df


def safe_jsonify(data, status=200):
    """Flask-version-agnostic JSON response.

    Uses json.dumps with default=str as ultimate fallback so it
    NEVER raises a serialisation error.
    """
    payload = json.dumps(data, ensure_ascii=False, default=str)
    return Response(payload, status=status, mimetype='application/json')
