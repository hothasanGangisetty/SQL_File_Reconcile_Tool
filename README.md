<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Flask-REST_API-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Single_Server-Deploy-22C55E?style=for-the-badge&logo=rocket&logoColor=white" />
</p>

# SQL-to-File Reconciliation Tool

> **v2 — Single-Server Deployment Edition**
>
> Previous README preserved as [`README_v1.md`](README_v1.md).

A production-ready web application that compares SQL Server query results against Excel/CSV files. It identifies mismatched values, missing rows, and extra records using a **Smart Fingerprint Engine** (hash-based, order-independent), then presents them in a categorized, color-coded view with one-click export.

**New in v2:** Flask serves both the API *and* the React UI from a single `python app.py` command. No Node.js required at runtime.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Deployment Options](#deployment-options)
  - [Option A: Single Server (Recommended)](#option-a-single-server-recommended)
  - [Option B: Development Mode (Two Servers)](#option-b-development-mode-two-servers)
  - [Option C: Org Laptop (No Node.js)](#option-c-org-laptop-no-nodejs)
- [Usage Guide (Step-by-Step)](#usage-guide-step-by-step)
- [Database Connectivity](#database-connectivity)
- [How the Comparison Engine Works](#how-the-comparison-engine-works)
- [How Excel and CSV Export Works](#how-excel-and-csv-export-works)
- [API Reference](#api-reference)
- [Performance Benchmarks](#performance-benchmarks)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

When working with databases, there are many scenarios where you need to verify that data in a SQL database matches data in an external file: data migrations, system integrations, report validation, ETL verification, periodic audits, or cross-system reconciliation.

This tool automates that process:

```
SQL Server (Source)  +  Excel/CSV (File)
         |                     |
         +----------+----------+
                    |
          Comparison Engine
    (Key-Based or Smart Fingerprint)
                    |
         +----------+----------+
         |          |          |
    Mismatched   Missing    Extra
      Rows       from File  in File
    (Pre/Post)  (SQL Only) (File Only)
         |          |          |
    Color-Coded Results in Browser
         |
    Excel / CSV Export
```

**Example:** You have a `Payments` table with 500,000 rows in your database and an Excel export from another system. Run the tool and it instantly shows which rows differ, which are missing, and which are extra — down to the individual cell level. Results are exportable as color-coded Excel or plain CSV.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Single-Server Deployment** | Flask serves both the React UI and the API. One command: `python app.py`. No Node.js needed at runtime |
| **Windows Authentication** | Connects to SQL Server using your current Windows login. No credentials to manage |
| **Excel and CSV Upload** | Supports `.xlsx`, `.xls`, and `.csv` file formats with drag-and-drop |
| **Smart Column Mapping** | Auto-maps columns by name. Manually remap when names differ (e.g., `CustomerName` → `Name`) |
| **Key-Based Matching** | Select primary key columns for intelligent row matching (e.g., match by `PaymentID`) |
| **Smart Fingerprint Matching** | When no keys are selected, rows are matched by content using hash fingerprinting and similarity pairing. **Order-independent and fully accurate** |
| **Pre/Post Mismatch Display** | Mismatched rows shown as paired "pre" (SQL) and "post" (File) rows side by side |
| **Cell-Level Highlighting** | Individual cells with different values are highlighted red in the results grid |
| **Colored Excel Export** | Download results as a styled `.xlsx` file with color-coded rows and highlighted mismatches |
| **CSV Export** | Download plain-text CSV results with one click (generated client-side) |
| **Categorized Results** | Three collapsible sections: Mismatched, Missing (SQL only), Extra (File only) |
| **Disk-Based Parquet Caching** | Uploaded files and results stored as Parquet for efficient large-dataset handling |
| **SQL Safety** | Blocks all write operations (DROP, DELETE, UPDATE, INSERT, ALTER, EXEC, TRUNCATE, CREATE, MERGE, GRANT, REVOKE). Read-only access enforced at the API level |
| **CMD-Style Console** | Built-in terminal panel with timestamped, color-coded logs for every operation |
| **1M Row Tested** | Benchmarked with 1,000,000 rows × 10 columns. Smart Fingerprint mode completes in ~33 seconds |

---

## Architecture

### How Flask Serves the React UI

```
Browser Request: http://localhost:5000
                     |
                     v
              Flask (app.py)
              /             \
    /api/* routes       Catch-all route
    (JSON responses)    (serve React files)
         |                    |
   comparison_engine.py   frontend/dist/
   storage_manager.py       index.html
   pyodbc → SQL Server      assets/*.js
                             assets/*.css
```

When you run `npm run build` in the frontend, Vite compiles all React/JSX/Tailwind code into three static files:
- `frontend/dist/index.html` (0.4 KB)
- `frontend/dist/assets/index-*.js` (220 KB, minified)
- `frontend/dist/assets/index-*.css` (22 KB, minified)

Flask serves these files directly. When the browser requests `/`, Flask returns `index.html`. When it requests `/api/config`, Flask runs the Python API logic. **Same port, same server, zero CORS issues.**

### Request Flow

```
Browser                        Flask Server (port 5000)              SQL Server
  |                                    |                                  |
  |-- GET / -------------------------->|                                  |
  |<-- index.html, JS, CSS -----------|                                  |
  |                                    |                                  |
  |-- GET /api/config ---------------->|                                  |
  |<-- db_config.json data ------------|                                  |
  |                                    |                                  |
  |-- POST /api/connect -------------->|                                  |
  |   {server, database}               |-- pyodbc.connect() ------------>|
  |                                    |<-- connection OK ----------------|
  |<-- success ------------------------|                                  |
  |                                    |                                  |
  |-- POST /api/preview_sql ---------->|                                  |
  |   {server, database, query}        |-- pd.read_sql(query) ---------->|
  |                                    |<-- DataFrame -------------------|
  |<-- columns + preview rows ---------|                                  |
  |                                    |                                  |
  |-- POST /api/upload_file ---------->|                                  |
  |   (multipart file)                 |-- parse → save_df() (Parquet)   |
  |<-- file_id + preview --------------|                                  |
  |                                    |                                  |
  |-- POST /api/run_comparison ------->|                                  |
  |   {file_id, server, db, query,     |-- fetch SQL data --------------->|
  |    column_mapping, keys}           |<-- DataFrame -------------------|
  |                                    |-- run_hybrid_comparison()        |
  |                                    |   (hash/merge/pair/transform)    |
  |<-- summary + result_id ------------|                                  |
  |                                    |                                  |
  |-- GET /api/results_page?id=X ----->|                                  |
  |<-- paginated rows (5000/page) -----|                                  |
  |                                    |                                  |
  |-- GET /api/export_excel?id=X ----->|                                  |
  |<-- styled .xlsx file download -----|                                  |
```

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.10+ | Runtime |
| Flask | latest | Web framework, API routes, static file serving |
| Flask-CORS | latest | Cross-Origin Resource Sharing (for dev mode) |
| Pandas | latest | DataFrame operations, SQL reading, data manipulation |
| PyODBC | latest | SQL Server connectivity via ODBC Driver 17 |
| PyArrow | latest | Parquet file read/write for disk-based caching |
| OpenPyXL | latest | Color-coded Excel export generation |
| SQLAlchemy | latest | Optional ORM support |
| NumPy | (via Pandas) | Vectorized operations, similarity matrix |

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.2 | UI component library |
| Vite | 5.x | Build tool (compiles JSX → production JS) |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Axios | 1.6+ | HTTP client for API calls |
| Lucide React | latest | Icon library |

### System Requirements

| Component | Required |
|-----------|----------|
| ODBC Driver 17 for SQL Server | Yes — for SQL Server connectivity |
| SQL Server (any edition) | Yes — Express, Developer, Standard, or Enterprise |
| Windows OS | Recommended (Windows Authentication requires it) |

---

## Project Structure

```
SQL_File_Reconcile_Tool/
│
├── backend/                              Python Flask API + Static Server
│   ├── app.py                            Main server: API routes + serves React UI from dist/
│   ├── comparison_engine.py              Core comparison logic (key-based + smart fingerprint)
│   ├── storage_manager.py                Parquet disk-cache manager (save/load DataFrames)
│   ├── db_config.json                    Database connection hierarchy configuration
│   ├── requirements.txt                  Python dependencies
│   └── temp_cache/                       Auto-created at runtime
│       ├── uploads/                      Uploaded file data cached as Parquet
│       └── results/                      Comparison result data cached as Parquet
│
├── frontend/                             React UI (source + production build)
│   ├── dist/                             ⭐ Pre-built production files (served by Flask)
│   │   ├── index.html                    Compiled entry HTML
│   │   └── assets/
│   │       ├── index-*.js                Minified React bundle (220 KB)
│   │       └── index-*.css               Minified Tailwind CSS (22 KB)
│   ├── index.html                        Source entry HTML (for Vite dev server)
│   ├── package.json                      Node.js dependencies and scripts
│   ├── vite.config.js                    Vite config: dev proxy + build output settings
│   ├── tailwind.config.js                Tailwind CSS with custom brand palette
│   ├── postcss.config.js                 PostCSS + Tailwind plugin config
│   └── src/
│       ├── main.jsx                      React entry point
│       ├── App.jsx                       Main layout: sidebar, tabs, resizable console split
│       ├── index.css                     Global styles and Tailwind imports
│       ├── context/
│       │   └── ConsoleContext.jsx         React Context for console log state
│       └── components/
│           ├── Sidebar.jsx               Module selector (SQL-to-File active, others planned)
│           ├── ConnectionBar.jsx         Env/Server/DB dropdowns with connect/disconnect
│           ├── ConsolePanel.jsx          CMD-style terminal with color-coded log output
│           ├── SqlQueryTab.jsx           Tab 1: SQL query textarea, execute, preview
│           ├── FileUploadTab.jsx         Tab 2: Drag-and-drop file upload
│           ├── KeysMappingTab.jsx        Tab 3: Column mapping table and key selection
│           └── RunComparisonTab.jsx      Tab 4: Run comparison, view results, export
│
├── test_data/                            Sample Excel files for testing
├── README.md                             This file
└── README_v1.md                          Previous version of README (preserved)
```

### What Each Backend File Does

| File | Responsibility |
|------|---------------|
| **app.py** | Flask server with two roles: **(1) API** — `/api/config`, `/api/connect`, `/api/preview_sql`, `/api/upload_file`, `/api/run_comparison`, `/api/results_page`, `/api/export_excel`. **(2) Static server** — catch-all route serves `frontend/dist/index.html` and assets. Uses `send_from_directory()` to deliver the React build |
| **comparison_engine.py** | Core logic. `run_hybrid_comparison()` is the entry point. It branches into key-based (`pd.merge`) or smart fingerprint (`pd.util.hash_pandas_object` + multiset matching + similarity pairing). `_fast_normalize_series()` provides vectorized normalization for 1M+ rows. `transform_to_pre_post()` stacks results into pre/post display format |
| **storage_manager.py** | Manages Parquet file caching. `save_df()` converts mixed-type columns to strings for PyArrow compatibility, writes to disk. `load_df()` reads them back. `clear_cache()` removes all cached data. Separate directories for uploads vs results |
| **db_config.json** | JSON hierarchy: Environment → Server Instance → Databases. Frontend reads via `/api/config` to populate cascading dropdowns |
| **requirements.txt** | Python package list: flask, flask-cors, pandas, pyodbc, openpyxl, sqlalchemy, pyarrow |

### What Each Frontend File Does

| File | Responsibility |
|------|---------------|
| **App.jsx** | Root layout: sidebar, connection bar, tab bar, content area, and vertically resizable console. Manages all lifted state (SQL data, file data, mapping state). Controls tab locking — tabs unlock sequentially as steps complete |
| **ConsoleContext.jsx** | React Context providing `log()`, `logTable()`, and `clear()` functions. All components write messages to the shared console panel through this context |
| **Sidebar.jsx** | Left sidebar showing module options. Currently only SQL-to-File is active. Placeholder for future File-to-File module |
| **ConnectionBar.jsx** | Top bar with cascading dropdowns (Environment → Server → Database) and Connect/Disconnect buttons. Calls `/api/config` on mount, `/api/connect` on click |
| **ConsolePanel.jsx** | CMD-style terminal. Renders timestamped log entries with color coding (info=blue, success=green, error=red, warn=yellow, system=gray). Supports table previews with ellipsis and a blinking cursor prompt |
| **SqlQueryTab.jsx** | SQL query text area with Execute button. Calls `/api/preview_sql`. Displays row count badge. Logs table preview with column names to console |
| **FileUploadTab.jsx** | Drag-and-drop upload zone with file type validation. Calls `/api/upload_file` with FormData. Shows file name, row count, and column count on success |
| **KeysMappingTab.jsx** | Two-column mapping table with dropdowns. Auto-matches columns by name on load. Key icon toggle buttons to mark primary key columns. Unmapped columns are excluded from comparison |
| **RunComparisonTab.jsx** | Calls `/api/run_comparison`. Summary stats grid shows: Total SQL Rows, Total File Rows, Matched Count, Mismatches, Missing, Extra, Comparison Mode, Elapsed Time. Three collapsible result sections with cell-level highlighting. Export buttons for Excel (styled) and CSV (plain) |
| **vite.config.js** | Dev mode: proxies `/api` requests to `http://localhost:5000`. Build: outputs to `frontend/dist/` |

---

## Prerequisites

### For Full Development (build + run)

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.10+ | [python.org/downloads](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| ODBC Driver 17 | latest | [Microsoft Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |
| SQL Server | Any edition | Express, Developer, Standard, or Enterprise |

### For Runtime Only (org laptop / demo)

| Software | Version | Notes |
|----------|---------|-------|
| Python | 3.10+ | Required |
| ODBC Driver 17 | latest | Required for SQL Server |
| SQL Server | Any edition | Required |
| Node.js | **NOT NEEDED** | The `dist/` folder is pre-built and committed to the repo |

Verify in PowerShell:
```powershell
python --version                     # Must show 3.10+
pip --version                        # Comes with Python
Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }   # Must list ODBC Driver 17
```

---

## Installation

### 1. Clone the Repository

```powershell
git clone https://github.com/hothasanGangisetty/SQL_File_Reconcile_Tool.git
cd SQL_File_Reconcile_Tool
```

### 2. Install Python Packages

```powershell
cd backend
pip install -r requirements.txt
```

This installs: flask, flask-cors, pandas, pyodbc, openpyxl, sqlalchemy, pyarrow.

### 3. Configure Database Connections

Edit `backend/db_config.json` to point to your SQL Server instances:

```json
{
  "environments": [
    {
      "env_name": "Production",
      "instances": [
        {
          "server_label": "Main DB Server",
          "host": "db-server.company.com",
          "default_port": 1433,
          "databases": ["SalesDB", "InventoryDB"]
        }
      ]
    },
    {
      "env_name": "Development",
      "instances": [
        {
          "server_label": "Local SQL Express",
          "host": "localhost\\SQLEXPRESS",
          "default_port": 1433,
          "databases": ["TestDB"]
        }
      ]
    }
  ]
}
```

### 4. (Optional) Rebuild the Frontend

Only needed if you modify React source files. The repo already includes pre-built `dist/` files.

```powershell
cd frontend
npm install
npm run build
```

---

## Deployment Options

### Option A: Single Server (Recommended)

**One terminal. One command. Best for demos and production use.**

```powershell
cd SQL_File_Reconcile_Tool\backend
python app.py
```

Open **http://localhost:5000** in your browser. Flask serves both the UI and the API.

```
What happens:
  http://localhost:5000          → React UI (from frontend/dist/)
  http://localhost:5000/api/*    → Flask API endpoints
```

### Option B: Development Mode (Two Servers)

**Use when actively editing React source code. Gives you hot-reload.**

```powershell
# Terminal 1: Backend
cd backend
python app.py
# Runs on http://localhost:5000

# Terminal 2: Frontend (with hot-reload)
cd frontend
npm run dev
# Runs on http://localhost:5173, proxies /api to :5000
```

Open **http://localhost:5173**. Vite proxies all `/api` calls to Flask automatically (configured in `vite.config.js`).

### Option C: Org Laptop (No Node.js)

**For machines where Node.js is not installed or blocked by corporate policy.**

The `dist/` folder is already committed to the GitHub repo. Just clone and run:

```powershell
# 1. Clone (or git pull if already cloned)
git clone https://github.com/hothasanGangisetty/SQL_File_Reconcile_Tool.git

# 2. Install Python packages
cd SQL_File_Reconcile_Tool\backend
pip install -r requirements.txt

# 3. Edit db_config.json with your server details

# 4. Run
python app.py
```

Open **http://localhost:5000**. That's it — no `npm`, no `node`, no `npm run dev`.

**Alternative if git is also blocked:** Copy the entire `SQL_File_Reconcile_Tool` folder via USB/shared drive/email ZIP.

### Deployment Comparison

| | Single Server | Dev Mode | Org Laptop |
|---|---|---|---|
| **Terminals needed** | 1 | 2 | 1 |
| **Node.js required** | No | Yes | No |
| **Hot-reload** | No | Yes | No |
| **URL** | localhost:5000 | localhost:5173 | localhost:5000 |
| **Best for** | Demos, production | Active React development | Restricted machines |

---

## Usage Guide (Step-by-Step)

The application uses a tab-based workflow. Tabs unlock sequentially as you complete each step.

### Step 1: Connect to Database

1. Select an **Environment** from the first dropdown (populated from `db_config.json`)
2. Select a **Server Instance**
3. Select a **Database**
4. Click **Connect**
5. Console shows: `Connected to <server> / <database> — Successfully connected`

### Step 2: SQL Query

1. Navigate to the **SQL Query** tab
2. Write a SELECT query (e.g., `SELECT * FROM Payments`)
3. Click **Execute**
4. Console shows a table preview with column names and top rows
5. A row count badge appears (e.g., `15 rows`)

> **Safety:** Write queries (DROP, DELETE, UPDATE, INSERT, ALTER, EXEC, TRUNCATE, CREATE, MERGE, GRANT, REVOKE) are blocked at the API level. Only SELECT queries are allowed.

### Step 3: Upload File

1. Navigate to the **File Upload** tab
2. Drag and drop an Excel or CSV file (or click to browse)
3. Supported formats: `.xlsx`, `.xls`, `.csv`
4. Console shows: `File uploaded successfully: <filename>` with row/column counts

### Step 4: Column Mapping

1. Navigate to the **Keys & Mapping** tab
2. A mapping table shows SQL columns on the left and File columns on the right
3. Columns with matching names are auto-mapped (e.g., `Name` ↔ `Name`)
4. Use dropdowns to manually remap columns where names differ
5. Click the **key icon** next to any column to mark it as a primary key for matching
6. If **no keys are selected**, the engine uses Smart Fingerprint mode (hash-based, order-independent)

### Step 5: Run Comparison

1. Navigate to the **Run Comparison** tab
2. Click **Run Comparison**
3. A summary grid appears:

| Stat | Description |
|------|-------------|
| **SQL Rows** | Total rows from the SQL query |
| **File Rows** | Total rows from the uploaded file |
| **Matched** | Rows that exist in both and are identical |
| **Mismatches** | Rows that exist in both but have different values |
| **Only in SQL** | Rows in SQL but not in the file (missing from file) |
| **Only in File** | Rows in the file but not in SQL (extra in file) |
| **Mode** | Key-Based or Smart Fingerprint |
| **Time** | Elapsed comparison time |

4. Results appear in three collapsible sections:

| Section | Color | Meaning |
|---------|-------|---------|
| **Mismatched Rows** | Yellow (SQL) / Green (File) | Rows exist in both but have different values. Shown as pre/post pairs. Changed cells highlighted red |
| **Missing from File** | Amber | Rows that exist in SQL but not in the file |
| **Extra in File** | Rose/Pink | Rows that exist in the file but not in SQL |

### Step 6: Export

- **Export Excel** — Downloads a color-coded `.xlsx` file matching the web UI colors
- **Export CSV** — Downloads a plain-text CSV (generated client-side, no server call)

---

## Database Connectivity

### How the Connection Works

The backend connects to SQL Server using **PyODBC** with **ODBC Driver 17 for SQL Server**:

```python
conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    "Trusted_Connection=yes;"
)
conn = pyodbc.connect(conn_str, timeout=5)
```

This uses **Windows Authentication** (Trusted Connection). It authenticates using the Windows user account running the Flask server. No username or password needed.

### Error Diagnosis

The `/api/connect` endpoint provides detailed error codes:

| ODBC Code | Meaning | Common Cause |
|-----------|---------|--------------|
| `08001` | Unreachable Server | Wrong IP, SQL Server not running, firewall blocking port 1433 |
| `28000` | Authentication Failed | Windows user doesn't have DB permissions |
| `HYT00` | Connection Timeout | Server exists but too slow to respond |

### Configuring db_config.json

Three-level hierarchy: **Environment → Server Instance → Databases**.

```json
{
  "environments": [
    {
      "env_name": "Production",
      "instances": [
        {
          "server_label": "Main DB Server",
          "host": "db-server.company.com",
          "default_port": 1433,
          "databases": ["SalesDB", "InventoryDB"]
        }
      ]
    }
  ]
}
```

The frontend reads this via `/api/config` on page load and populates cascading dropdowns. Restart the backend after editing.

### Connecting to Different SQL Server Editions

| Scenario | Host Value in db_config.json |
|----------|------------------------------|
| SQL Server Express (local) | `localhost\\SQLEXPRESS` |
| SQL Server default instance (local) | `localhost` or `.` |
| SQL Server Developer Edition (local) | `localhost` or `localhost\\INSTANCENAME` |
| Remote SQL Server | `192.168.1.100` or `server-hostname` |
| Remote named instance | `server-name\\INSTANCENAME` |
| Azure SQL Database | `yourserver.database.windows.net` (requires auth changes) |

Use double backslashes (`\\`) in JSON for named instances.

### Switching Authentication

```python
# Current: Windows Authentication
"Trusted_Connection=yes;"

# SQL Server Authentication (username/password):
f"UID={username};PWD={password};"
```

### Switching to MySQL

```bash
pip install pymysql
```
```python
import pymysql
conn = pymysql.connect(host=host, database=database, user=user, password=password, port=3306)
df = pd.read_sql(query, conn)  # Works identically with Pandas
```

### Switching to PostgreSQL

```bash
pip install psycopg2-binary
```
```python
import psycopg2
conn = psycopg2.connect(host=host, database=database, user=user, password=password, port=5432)
df = pd.read_sql(query, conn)  # Works identically with Pandas
```

> The comparison engine, file upload, and export features are **database-agnostic** because they work with Pandas DataFrames, not raw SQL connections.

---

## How the Comparison Engine Works

The core logic lives in `comparison_engine.py`. The entry point is `run_hybrid_comparison(df_sql, df_file, keys)`.

### Strategy A: Key-Based Comparison

Used when the user selects one or more key columns (e.g., `PaymentID`).

```python
merged = pd.merge(df_sql, df_file, on=["PaymentID"], how="outer",
                  suffixes=("_sql", "_file"), indicator=True)
```

The `_merge` indicator column tells us:
- `both` → key exists in both sides → compare each column value
- `left_only` → key only in SQL → Missing from File
- `right_only` → key only in File → Extra in File

For rows in `both`, each column is normalized and compared. If any value differs, the row is a **Mismatch**.

### Strategy B: Smart Fingerprint Comparison (No Keys)

Used when no keys are selected. A 3-phase content-matching algorithm that is **fully accurate regardless of row order**:

```
┌─────────────────────────────────────────────────────┐
│  Phase 1: Normalize + Hash                          │
│  Every cell → normalized string → row hash          │
│  Uses pd.util.hash_pandas_object()                  │
│  Vectorized: handles 1M rows in ~15 seconds         │
├─────────────────────────────────────────────────────┤
│  Phase 2: Multiset Exact-Match Elimination          │
│  Compare hash counts between SQL and File           │
│  If hash appears 3× in SQL and 2× in File:          │
│    → 2 matched, 1 remains unmatched                 │
│  Eliminates ~99.9% of rows for typical datasets     │
├─────────────────────────────────────────────────────┤
│  Phase 3: Similarity Pairing (remaining rows)       │
│  Build NxM similarity matrix (column-match count)   │
│  Greedy best-first pairing above 30% threshold      │
│  Catches rows where only a few values changed        │
│  Skipped if unmatched set > 5,000 per side           │
└─────────────────────────────────────────────────────┘
```

**Real-world example with 1M rows:**
```
1,000,000 SQL rows  +  1,000,000 File rows
           |
   Normalize + Hash             (~15s, vectorized regex)
           |
   Multiset match               (~5s)
   999,850 exact matches eliminated
           |
   150 × 150 = 22,500          (<1s)
   similarity comparisons
           |
   100 Mismatches, 25 SQL-only, 25 File-only
   Total: ~33 seconds
```

### Value Normalization

Before any comparison, values are normalized to prevent false mismatches:

| SQL Value | File Value | After Normalization | Result |
|-----------|------------|---------------------|--------|
| `2025-11-01 00:00:00` | `2025-11-01` | Both → `2025-11-01` | Match |
| `1750.0` | `1750` | Both → `1750` | Match |
| `1750.50` | `1750.5` | Both → `1750.5` | Match |
| `None` | `NaN` | Both → `__NULL__` | Match |
| `  Alice  ` | `Alice` | Both → `Alice` | Match |
| `nan` | `NaT` | Both → `__NULL__` | Match |

**Two implementations exist for different scales:**

| Function | Method | Speed | Used For |
|----------|--------|-------|----------|
| `normalize_series_for_comparison()` | Per-cell Python `.apply()` | Moderate | Cell-level mismatch detection in result sets |
| `_fast_normalize_series()` | Vectorized regex (`str.replace`, `str.strip`) | 10-30× faster | Fingerprinting 1M+ rows for hashing |

### Pre/Post Transformation

`transform_to_pre_post()` converts engine results into the stacked display format:

| Status | Rows Generated | pre/post Label |
|--------|----------------|----------------|
| Mismatch | 2 rows: SQL values + File values | `pre` (SQL), `post` (File) |
| Only in SQL | 1 row: SQL values | `pre` |
| Only in File | 1 row: File values | `post` |

A hidden `_mismatch_cols` field tracks which specific columns differ, enabling cell-level red highlighting in both the web UI and the Excel export.

### Comparison Mode Summary

| | Key-Based | Smart Fingerprint |
|---|-----------|-------------------|
| **Accuracy** | Exact | Exact (order-independent) |
| **Row order matters?** | No | No |
| **Handles duplicates?** | Yes (by key) | Yes (multiset matching) |
| **Handles insertions/deletions?** | Yes | Yes |
| **1M rows** | ~5-10 seconds | ~30-40 seconds |
| **When to use** | When a unique ID column exists | When no unique ID exists |
| **Similarity pairing** | N/A | Yes (catches near-matches) |
| **Max unmatched for pairing** | N/A | 5,000 per side |

---

## How Excel and CSV Export Works

### CSV Export

Handled entirely in the **frontend** (`RunComparisonTab.jsx`). The loaded result data is serialized to a comma-separated string, wrapped in a `Blob`, and triggered as a file download via a temporary anchor element. No backend call needed. Instant download regardless of size.

### Colored Excel Export

Handled by the `/api/export_excel` endpoint in `app.py` using **OpenPyXL**:

1. Result DataFrame loaded from Parquet cache
2. Rows split into three sections: Mismatched, SQL Only, File Only
3. Each section has a title header row + column header row + data rows
4. Color scheme:

| Row Type | Fill Color | Hex Code |
|----------|-----------|----------|
| Mismatch pre (SQL values) | Yellow | `#FEF9C3` |
| Mismatch post (File values) | Green | `#DCFCE7` |
| Changed cell within mismatch | Red (bold) | `#FECACA` |
| SQL Only rows | Amber | `#FDE68A` |
| File Only rows | Rose | `#FECDD3` |
| Column headers | Dark slate | `#334155` |
| Section titles | Light gray | `#F3F4F6` |

5. Column widths auto-calculated from content (sampled from first 100 rows, max width 40)
6. Workbook saved to BytesIO buffer and returned as a streaming file download

The Excel color scheme matches the web UI exactly.

---

## API Reference

All endpoints are prefixed with `/api/`. Non-API routes serve the React frontend.

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|-------------|----------|
| GET | `/api/config` | Load database hierarchy | — | `{environments: [...]}` |
| POST | `/api/connect` | Test SQL Server connection | `{server, database}` | `{status, message, info}` |
| POST | `/api/preview_sql` | Execute query, return preview | `{server, database, query}` | `{columns, preview_data, row_count_estimate}` |
| POST | `/api/upload_file` | Upload Excel/CSV file | `multipart/form-data` | `{file_id, columns, preview_data, total_rows}` |
| POST | `/api/run_comparison` | Run comparison engine | `{file_id, server, database, query, column_mapping, keys}` | `{result_id, summary, preview_rows, columns}` |
| GET | `/api/results_page` | Paginated result retrieval | `?result_id=X&page=1&size=5000` | `{data, page, total_pages, has_more}` |
| GET | `/api/export_excel` | Download styled Excel | `?result_id=X` | `.xlsx` file download |
| GET | `/` | Serve React UI | — | `index.html` |
| GET | `/<path>` | Serve static assets (JS/CSS) | — | File from `frontend/dist/` |

### SQL Safety

The `/api/preview_sql` endpoint blocks these keywords in queries:
`DROP`, `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE`, `EXEC`, `CREATE`, `MERGE`

Returns HTTP 403 with: `"Security Alert: Only SELECT queries are permitted in this environment."`

---

## Performance Benchmarks

Tested on a standard Windows laptop (Intel i7, 16GB RAM).

| Dataset Size | Columns | Mode | Time | Notes |
|-------------|---------|------|------|-------|
| 100 rows | 10 | Key-Based | <1s | Instant |
| 100 rows | 10 | Smart Fingerprint | <1s | Instant |
| 10,000 rows | 10 | Key-Based | ~1s | |
| 10,000 rows | 10 | Smart Fingerprint | ~2s | |
| 100,000 rows | 10 | Key-Based | ~3s | |
| 100,000 rows | 10 | Smart Fingerprint | ~8s | |
| 1,000,000 rows | 10 | Key-Based | ~5-10s | |
| 1,000,000 rows | 10 | Smart Fingerprint | ~33s | Benchmarked via test_engine.py |

**Bottleneck analysis for 1M Smart Fingerprint:**
- Vectorized normalization: ~15s
- Hashing: ~3s
- Multiset matching: ~5s
- Similarity pairing: <1s (only processes unmatched rows)
- Pre/post transformation: ~5s

---

## Troubleshooting

### Connection Errors

| Problem | Solution |
|---------|----------|
| SQL Server not running | `Get-Service MSSQL*` in PowerShell. Start: `Start-Service MSSQL$SQLEXPRESS` |
| Wrong host in config | Verify `db_config.json` has correct `host` value. Restart backend after editing |
| ODBC Driver not installed | Install "ODBC Driver 17 for SQL Server" from [Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |
| TCP/IP not enabled | Open SQL Server Configuration Manager → Network Configuration → Enable TCP/IP |
| Firewall blocking | Allow port 1433 in Windows Firewall |
| Authentication failed (28000) | Your Windows user needs DB access. Contact your DBA |
| Connection timeout (HYT00) | Server is slow or overloaded. Try again or increase timeout in `app.py` |

### Frontend / UI Errors

| Problem | Solution |
|---------|----------|
| Blank white page at localhost:5000 | Ensure `frontend/dist/` exists. If missing, run `npm run build` in `frontend/` |
| "Frontend not built" JSON error | The `dist/` folder is missing. Build it or copy from another machine |
| `npm run dev` shows "dev script not found" | You're in the wrong directory. `cd frontend` first, then run |
| `npm install` fails (corporate proxy) | Use the pre-built `dist/` from the repo. Skip Node.js entirely (Option C) |
| Stale/cached page after update | Hard refresh: `Ctrl + Shift + R` in the browser |

### Upload / Cache Errors

| Problem | Solution |
|---------|----------|
| Parquet engine error | Ensure `pyarrow` is installed: `pip install pyarrow`. Restart backend |
| File session expired | Re-upload the file. Cached Parquet files are cleared on restart |
| "Invalid file format" | Only `.csv`, `.xlsx`, `.xls` are accepted |

### Port Conflicts

```powershell
# Find what's using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

# Kill the process
taskkill /F /PID <PID_NUMBER>
```

### Rebuilding the Frontend

If you modify any React source file, rebuild:

```powershell
cd frontend
npm run build        # or: npx vite build
```

Then restart `python app.py`. The new build is served immediately.

---

## FAQ

**How do I start the app?**
`cd backend` → `python app.py` → open `http://localhost:5000`. That's it.

**Do I need Node.js to run the app?**
No. The `dist/` folder (pre-built React) is included in the repo. Node.js is only needed if you want to modify and rebuild the React source code.

**Does this work with databases other than SQL Server?**
Currently connects to SQL Server via ODBC Driver 17. See [Database Connectivity](#database-connectivity) for MySQL and PostgreSQL instructions. The comparison engine is database-agnostic.

**How large a dataset can it handle?**
Tested with **1,000,000 rows × 10 columns**. Key-based: ~5-10 seconds. Smart Fingerprint: ~33 seconds. Uses disk-based Parquet caching so memory stays manageable.

**Does it modify my database?**
No. Only SELECT queries are allowed. 11 write keywords are blocked at the API level (DROP, DELETE, UPDATE, INSERT, ALTER, EXEC, TRUNCATE, CREATE, MERGE, GRANT, REVOKE).

**Do I need to enter a username and password?**
Not with Windows Authentication. The tool uses the Windows account running the Flask server.

**What file formats are supported?**
`.xlsx` (Excel), `.xls` (Legacy Excel), `.csv` (Comma-Separated Values).

**Can I compare two files without a database?**
Not in the current version. One side must be a SQL query. The sidebar has a placeholder for a future File-to-File module.

**Why is there a `README_v1.md` file?**
That's the previous version of this README, preserved for reference. The file you're reading now (`README.md`) is the latest with all v2 deployment changes.

**What changed in v2?**
- Flask now serves the React UI (single-server deployment)
- All API URLs changed from hardcoded `http://127.0.0.1:5000` to relative paths (`/api/...`)
- `frontend/dist/` is committed to the repo for Node.js-free deployment
- `vite.config.js` updated with dev proxy and build settings
- Three deployment options documented (Single Server, Dev Mode, Org Laptop)

**Where is the old `npm run dev` two-server approach?**
Still works. See [Option B: Development Mode](#option-b-development-mode-two-servers). Use it when you're actively editing React code and want hot-reload.

**What if `pip install` fails on the org laptop?**
Copy the entire project folder (including Python packages if needed) via USB/network share. Or ask IT to whitelist `pypi.org`.
