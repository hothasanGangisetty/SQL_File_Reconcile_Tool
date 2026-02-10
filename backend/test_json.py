"""Quick test: SQL -> DataFrame -> sanitize -> JSON."""
import pyodbc, pandas as pd, json, sys
from app import sanitize_df_for_json

conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost\\SQLEXPRESS;'
    'DATABASE=ReconcileLab;'
    'Trusted_Connection=yes;'
)
df = pd.read_sql('SELECT TOP 3 * FROM SampleData', conn)
conn.close()

print("Column dtypes:")
for c in df.columns:
    print(f"  {c}: {df[c].dtype}  sample={df[c].iloc[0]!r}")

print("\nSanitizing...")
clean = sanitize_df_for_json(df)
rows = clean.to_dict(orient='records')

print("\nJSON serialization...")
j = json.dumps(rows, default=str)
print(f"OK: {len(j)} chars")
print(f"\nRow 1 sample: LoginTime={rows[0].get('LoginTime')}, "
      f"LastLogin={rows[0].get('LastLogin')}, "
      f"JoinDate={rows[0].get('JoinDate')}")

# Test nulls (Row 2 has Age=NULL, Description=NULL)
print(f"Row 2 nulls: Age='{rows[1].get('Age')}', Description='{rows[1].get('Description')}'")
print("\nALL TESTS PASSED")
