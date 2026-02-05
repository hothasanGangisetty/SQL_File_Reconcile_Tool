# Backend Development Roadmap

## Phase 1: Foundation & Connectivity (Completed)
- [x] Create `db_config.json` for environment hierarchy.
- [x] Create Flask App Structure.
- [x] Implement `/api/config` to serve the environment list.
- [x] Implement `/api/connect` to test Windows Authentication access.
- [x] Implemented robust Error Handling for connection failures (08001, 28000).

## Phase 2: Data Ingestion (Current Focus)
**Goal:** getting data *into* the system (Pandas DataFrames) so we can compare it later.
- [ ] **Endpoint: `/api/preview_sql`**:
    - Accepts: Server, DB, SQL Query.
    - Action: Executes query using `pandas.read_sql`.
    - Returns: Column list (for mapping) and Top 5 rows (for preview).
    - Validation: Block `DROP/DELETE/UPDATE` statements (Read-only safety).
- [ ] **Endpoint: `/api/upload_file`**:
    - Accepts: File (CSV/XLSX).
    - Action: Saves to temp storage, reads with Pandas.
    - Returns: Column list (for mapping) and Top 5 rows.

## Phase 3: The Hybrid Comparison Engine
**Goal:** The core logic to reconcile 1M+ rows.
- [ ] **Module: `engine.py`**:
    - Implement `Strategy A` (Key-Based): `pd.merge(indicator=True)`.
    - Implement `Strategy B` (Sequential): `reset_index()` + Row-by-Row compare.
    - Logic to identify "Yellow" (SQL/Pre) and "Red" (File/Post) values.
- [ ] **Endpoint: `/api/compare`**:
    - Receives: SQL Query, File ID, Selected Keys (optional).
    - Action: Runs the engine.
    - **Optimization:** Saves the full result to a local cached file (Pickle/Parquet) instead of RAM to handle 2M rows.

## Phase 4: Result Serving & Pagination
**Goal:** Serving the results to the UI without crashing the browser.
- [ ] **Endpoint: `/api/results`**:
    - Accepts: `page`, `page_size`, `cache_id`.
    - Action: Reads the specific slice (e.g., rows 100-200) from the cached result.
    - Returns: JSON data for the Grid.

---

### Executing Phase 2 Now
I will now implement the **Data Ingestion** endpoints (`preview_sql` and `upload_file`) in `backend/app.py`.
