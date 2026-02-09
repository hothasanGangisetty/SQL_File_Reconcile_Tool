<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Flask-REST_API-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

# SQL-to-File Reconciliation Tool

A web-based data reconciliation application that compares SQL Server query results against local Excel or CSV files. It identifies mismatched values, missing rows, and extra records, then presents them in a categorized, color-coded view with export support.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Usage Guide](#usage-guide)
- [Database Connectivity](#database-connectivity)
- [How the Comparison Engine Works](#how-the-comparison-engine-works)
- [How Excel and CSV Export Works](#how-excel-and-csv-export-works)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

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
```

**Example:** You have a `Payments` table with 15 rows in your database and an Excel export from another system. Run the tool and it instantly shows which rows differ, which are missing, and which are extra, down to the individual cell level.

## Key Features

| Feature | Description |
|---------|-------------|
| **Windows Authentication** | Connects to SQL Server using your current Windows login. No credentials required |
| **Excel and CSV Upload** | Supports `.xlsx`, `.xls`, and `.csv` file formats |
| **Smart Column Mapping** | Auto-maps columns by name. Manually map when names differ (e.g., `CustomerName` to `Name`) |
| **Key-Based Matching** | Select primary key columns for intelligent row matching (e.g., match by `PaymentID`) |
| **Smart Fingerprint Matching** | When no keys are selected, rows are matched by content using hash fingerprinting and similarity pairing. Order-independent and fully accurate |
| **Pre/Post Display** | Mismatched rows are shown as paired "pre" (SQL) and "post" (File) rows |
| **Cell-Level Highlighting** | Individual cells with different values are highlighted in the results |
| **Colored Excel Export** | Download results as a styled `.xlsx` file with color-coded rows and highlighted mismatches |
| **CSV Export** | Download plain-text CSV results with one click |
| **Categorized Results** | Three collapsible sections: Mismatched, Missing (SQL only), Extra (File only) |
| **Disk-Based Caching** | Results stored as Parquet files for efficient handling of large datasets |
| **SQL Safety** | Blocks write operations (DROP, DELETE, UPDATE, INSERT, etc.). Read-only access only |
| **CMD-Style Console** | Built-in terminal console showing real-time operation logs |

## Tech Stack

**Frontend:** React 18, Vite 5, Tailwind CSS 3, Axios, Lucide React

**Backend:** Python, Flask, Pandas, PyODBC, PyArrow, OpenPyXL

## Project Structure

```
SQL_File_Reconcile_Tool/
|
|-- backend/                          Python Flask API
|   |-- app.py                        Main server: all API routes, Excel export endpoint
|   |-- comparison_engine.py          Core comparison logic (key-based and smart fingerprint)
|   |-- storage_manager.py            Parquet disk-cache manager (save/load DataFrames)
|   |-- db_config.json                Database connection hierarchy configuration
|   |-- requirements.txt              Python dependencies
|   |-- temp_cache/                   Auto-created at runtime
|       |-- uploads/                  Uploaded file data cached as Parquet
|       |-- results/                  Comparison result data cached as Parquet
|
|-- frontend/                         React UI
|   |-- index.html                    Entry HTML
|   |-- package.json                  Node.js dependencies
|   |-- vite.config.js                Vite dev server configuration
|   |-- tailwind.config.js            Tailwind CSS with custom brand palette
|   |-- postcss.config.js             PostCSS + Tailwind plugin config
|   |-- src/
|       |-- main.jsx                  React entry point
|       |-- App.jsx                   Main layout: sidebar, tabs, resizable console split
|       |-- index.css                 Global styles and Tailwind imports
|       |-- context/
|       |   |-- ConsoleContext.jsx     React Context for console log state
|       |-- components/
|           |-- Sidebar.jsx           Module selector (SQL-to-File active, others planned)
|           |-- ConnectionBar.jsx     Environment/Server/Database dropdowns with connect/disconnect
|           |-- ConsolePanel.jsx      CMD-style terminal with color-coded log output
|           |-- SqlQueryTab.jsx       Tab 1: SQL query textarea, execute, preview
|           |-- FileUploadTab.jsx     Tab 2: Drag-and-drop file upload
|           |-- KeysMappingTab.jsx    Tab 3: Column mapping table and key selection
|           |-- RunComparisonTab.jsx  Tab 4: Run comparison, view results, export
|
|-- test_data/                        Sample Excel files for trying the tool
```

### What Each Backend File Does

| File | Responsibility |
|------|---------------|
| **app.py** | Flask server with all API routes: `/api/config` (load db_config.json), `/api/connect` (test SQL connection), `/api/preview_sql` (execute query and return preview), `/api/upload_file` (parse Excel/CSV and cache as Parquet), `/api/run_comparison` (orchestrate full comparison), `/api/results_page` (paginated result retrieval), `/api/export_excel` (generate color-coded .xlsx file) |
| **comparison_engine.py** | Core logic. `run_hybrid_comparison()` compares SQL and File DataFrames using either key-based merge or smart fingerprint matching (hash + similarity pairing). `normalize_series_for_comparison()` handles date/datetime/numeric/whitespace normalization to prevent false mismatches. `_fast_normalize_series()` provides vectorized normalization for 1M+ row performance. `transform_to_pre_post()` converts results into stacked pre/post display format |
| **storage_manager.py** | Manages Parquet file caching. `save_df()` converts mixed-type columns to strings for Parquet compatibility, then writes to disk. `load_df()` reads them back. Keeps uploaded files and results in separate directories |
| **db_config.json** | JSON hierarchy defining Environment > Server Instance > Databases. The frontend reads this to populate cascading dropdowns |

### What Each Frontend File Does

| File | Responsibility |
|------|---------------|
| **App.jsx** | Root layout with sidebar, connection bar, tab bar, content area, and resizable console. Manages all lifted state (SQL data, file data, mapping state). Controls tab locking (tabs unlock sequentially as steps complete) |
| **ConsoleContext.jsx** | React Context providing `log()`, `logTable()`, and `clear()` functions. All components use this to write messages to the console panel |
| **Sidebar.jsx** | Left sidebar showing module options. Currently only SQL-to-File is active |
| **ConnectionBar.jsx** | Top bar with cascading dropdowns (Environment > Server > Database) and Connect/Disconnect buttons. Calls `/api/config` on mount and `/api/connect` on click |
| **ConsolePanel.jsx** | CMD-style terminal panel. Renders timestamped log entries with color coding, table previews with ellipsis for large datasets, and a blinking cursor prompt |
| **SqlQueryTab.jsx** | SQL query input with Execute button. Calls `/api/preview_sql`, displays row count badge, logs table preview to console |
| **FileUploadTab.jsx** | Drag-and-drop file upload zone. Calls `/api/upload_file` with FormData, displays file info on success |
| **KeysMappingTab.jsx** | Column mapping table. Auto-matches by name, allows manual remapping via dropdowns. Key selection toggle buttons for primary key columns |
| **RunComparisonTab.jsx** | Calls `/api/run_comparison`, displays summary stats (including matched count, comparison mode, elapsed time), renders three collapsible result sections (Mismatched/Missing/Extra). Export Excel and CSV buttons |

## Prerequisites

**Required software:**

1. **Python 3.10 or higher** - [python.org/downloads](https://www.python.org/downloads/)
2. **Node.js 18 or higher** - [nodejs.org](https://nodejs.org/)
3. **ODBC Driver 17 for SQL Server** - [Microsoft Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
4. **A running SQL Server instance** (any edition: Express, Standard, Enterprise, Developer)

Verify prerequisites in PowerShell:
```powershell
python --version
node --version
Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
```

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/hothasanGangisetty/SQL_File_Reconcile_Tool.git
cd SQL_File_Reconcile_Tool
```

**2. Backend setup**

```bash
cd backend
python -m venv venv

# Activate (PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

**3. Frontend setup**

```bash
cd ../frontend
npm install
```

**4. Configure database connections**

Edit `backend/db_config.json` to point to your SQL Server instances. See [Database Connectivity](#database-connectivity) for details.

## Running the Application

Open two terminals. Both must be running simultaneously.

**Terminal 1: Backend**
```bash
cd backend
python app.py
```
Expected output: `Running on http://127.0.0.1:5000`

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```
Expected output: `Local: http://localhost:5173/`

Open `http://localhost:5173` in your browser.

> Both servers must be running. The frontend (port 5173) calls the backend API (port 5000).

## Usage Guide

The application uses a tab-based workflow. Tabs unlock sequentially as you complete each step.

**Step 1: Connect.** Select an Environment, Server, and Database from the connection bar dropdowns. Click Connect.

**Step 2: SQL Query.** Write a SELECT query and click Execute. The console shows a preview with the first few rows and column names.

**Step 3: File Upload.** Drag and drop (or click to browse) an Excel or CSV file. Supported formats: `.xlsx`, `.xls`, `.csv`.

**Step 4: Column Mapping.** Map SQL columns to File columns. Columns with matching names are auto-mapped. Click the key icon next to any column to mark it as a primary key for matching. If no keys are selected, the engine uses Smart Fingerprint mode which matches rows by content regardless of order.

**Step 5: Run Comparison.** Click "Run Comparison". Results appear in three collapsible sections:

| Section | Meaning |
|---------|---------|
| **Mismatched Rows** | Rows exist in both sources but have different values. Displayed as pre (SQL) / post (File) pairs. Changed cells are highlighted |
| **Missing from File** | Rows that exist in SQL but not in the file |
| **Extra in File** | Rows that exist in the file but not in SQL |

## Database Connectivity

### How the Connection Works

The backend connects to SQL Server using **PyODBC** with the **ODBC Driver 17 for SQL Server**. The connection string is built in `app.py`:

```python
f"DRIVER={{ODBC Driver 17 for SQL Server}};"
f"SERVER={server};"
f"DATABASE={database};"
"Trusted_Connection=yes;"
```

This uses **Windows Authentication** (Trusted Connection), meaning it authenticates using the Windows user account that is running the Flask server. No username or password is needed.

### Configuring db_config.json

The file uses a three-level hierarchy: Environment > Server Instance > Databases.

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

The frontend reads this file via `/api/config` and populates cascading dropdowns. After editing, restart the backend for changes to take effect.

### Connecting to Different SQL Server Editions

| Scenario | Host Value in db_config.json |
|----------|------------------------------|
| SQL Server Express (local) | `localhost\\SQLEXPRESS` |
| SQL Server default instance (local) | `localhost` or `.` |
| SQL Server Developer Edition (local) | `localhost` (if default instance) or `localhost\\INSTANCENAME` |
| SQL Server Standard/Enterprise (local) | `localhost` (default) or `localhost\\INSTANCENAME` |
| Remote SQL Server | `192.168.1.100` or `server-hostname` |
| Remote named instance | `server-name\\INSTANCENAME` |
| Azure SQL Database | `yourserver.database.windows.net` (requires connection string changes, see below) |

Use double backslashes (`\\`) in JSON for named instances.

**For SQL Server with SQL Authentication (username/password),** modify `get_connection_string()` in `app.py`:

```python
# Current (Windows Auth):
"Trusted_Connection=yes;"

# Change to (SQL Auth):
f"UID={username};PWD={password};"
```

### Switching to MySQL

To connect to MySQL instead of SQL Server, three changes are needed:

**1. Install the MySQL connector:**
```bash
pip install pymysql
```

**2. Update the connection in app.py:**

Replace PyODBC with a MySQL connector. Change `get_connection_string()` and all `pyodbc.connect()` calls:

```python
# Replace pyodbc import with:
import pymysql

# Replace get_connection_string with:
def get_mysql_connection(host, database, user, password, port=3306):
    return pymysql.connect(
        host=host, database=database,
        user=user, password=password, port=port
    )

# pd.read_sql() works the same way with both connectors.
```

**3. Update db_config.json** to include MySQL hosts (no named instances needed, just hostname and port).

The rest of the application (comparison engine, file upload, export) remains unchanged because those components work with Pandas DataFrames, which are database-agnostic.

### Switching to PostgreSQL

```bash
pip install psycopg2-binary
```
```python
import psycopg2
conn = psycopg2.connect(host=host, database=database, user=user, password=password, port=5432)
df = pd.read_sql(query, conn)  # Works identically
```

### Connection Flow Diagram

```
Frontend (React)                    Backend (Flask)                  Database
     |                                   |                              |
     |-- GET /api/config --------------->|                              |
     |<-- db_config.json data -----------|                              |
     |                                   |                              |
     |-- POST /api/connect ------------->|                              |
     |   {server, database}              |-- pyodbc.connect() -------->|
     |                                   |<-- connection OK ------------|
     |<-- success -----------------------|                              |
     |                                   |                              |
     |-- POST /api/preview_sql --------->|                              |
     |   {server, database, query}       |-- pd.read_sql(query) ------>|
     |                                   |<-- DataFrame ----------------|
     |<-- columns + preview rows --------|                              |
```

## How the Comparison Engine Works

The core logic lives in `comparison_engine.py`. There are two comparison strategies:

### Strategy A: Key-Based Comparison

When the user selects one or more key columns (e.g., `PaymentID`), the engine uses `pd.merge()` with a full outer join:

```python
merged = pd.merge(df_sql, df_file, on=["PaymentID"], how="outer",
                  suffixes=("_sql", "_file"), indicator=True)
```

The `_merge` column tells us:
- `both` = key exists in both sides (compare column values)
- `left_only` = key only in SQL (missing from file)
- `right_only` = key only in file (extra in file)

For rows in `both`, each column is normalized and compared. If any column differs, the row is a Mismatch.

### Strategy B: Smart Fingerprint Comparison (No Keys)

When no keys are selected, the engine uses a 3-phase content-matching algorithm that is **fully accurate regardless of row order**:

**Phase 1 -- Fingerprint and Hash.** Every cell is normalized (dates, numbers, whitespace, nulls), then each row is hashed into a single integer fingerprint using `pd.util.hash_pandas_object()`. Two rows with identical content will always produce the same hash.

**Phase 2 -- Multiset Exact-Match Elimination.** Hash values are grouped and compared. If a hash appears 3 times in SQL and 2 times in File, 2 pairs are matched and 1 remains unmatched. This correctly handles duplicate rows.

**Phase 3 -- Similarity Pairing.** Remaining unmatched rows are compared using a column-level similarity matrix. For each SQL-File pair, the engine counts how many columns match. Pairs above a 30% threshold are greedily paired best-first. This catches rows where only a few values changed.

```
1M SQL rows  +  1M File rows
        |
   Normalize + Hash        (~15s, vectorized)
        |
   Multiset match          (~5s)
   999,850 exact matches eliminated
        |
   150 x 150 = 22,500     (<1s)
   similarity checks
        |
   100 Mismatches, 50 SQL-only, 50 File-only
   Total: ~30-40 seconds for 1M rows
```

If the unmatched set exceeds 5,000 rows per side, similarity pairing is skipped to prevent memory issues, and those rows are reported as missing/extra with a warning.

### Value Normalization

Before any comparison, column values are normalized to prevent false mismatches:

| SQL Value | File Value | After Normalization | Result |
|-----------|------------|---------------------|--------|
| `2025-11-01 00:00:00` | `2025-11-01` | Both become `2025-11-01` | Match |
| `1750.0` | `1750` | Both become `1750` | Match |
| `1750.50` | `1750.5` | Both become `1750.5` | Match |
| `None` | `NaN` | Both become `__NULL__` | Match |
| `  Alice  ` | `Alice` | Both become `Alice` | Match |

Two implementations exist:
- `normalize_series_for_comparison()` -- per-cell Python function, used for cell-level mismatch detection in small result sets
- `_fast_normalize_series()` -- vectorized regex-based, used for fingerprinting 1M+ rows (10-30x faster)

### Pre/Post Transformation

`transform_to_pre_post()` converts the results into a stacked display format:
- Each Mismatch produces 2 rows: a "pre" row (SQL values) and a "post" row (File values)
- Each SQL-only record produces 1 "pre" row
- Each File-only record produces 1 "post" row

A `_mismatch_cols` field tracks which specific columns differ, enabling cell-level highlighting in the UI.

### Comparison Mode Summary

| | Key-Based | Smart Fingerprint |
|---|-----------|-------------------|
| **Accuracy** | Exact | Exact (order-independent) |
| **Row order matters?** | No | No |
| **Handles duplicates?** | Yes (by key) | Yes (multiset matching) |
| **Handles insertions/deletions?** | Yes | Yes |
| **1M rows** | ~5-10 seconds | ~30-40 seconds |
| **When to use** | When a unique ID exists | When no unique ID exists |

## How Excel and CSV Export Works

### CSV Export

Handled entirely in the frontend (`RunComparisonTab.jsx`). The loaded result data is serialized to a comma-separated string, wrapped in a Blob, and triggered as a file download via a temporary anchor element. No backend call needed.

### Colored Excel Export

Handled by the `/api/export_excel` endpoint in `app.py` using the **OpenPyXL** library:

1. The result DataFrame is loaded from the Parquet cache
2. Rows are split into three categories (Mismatched, SQL Only, File Only)
3. Each category is written as a section with a title header row and column headers
4. Row coloring logic:
   - **Mismatch pre rows** (SQL values): Yellow fill (`FEF9C3`)
   - **Mismatch post rows** (File values): Green fill (`DCFCE7`)
   - **Changed cells within mismatch rows**: Red fill (`FECACA`) with bold red font
   - **SQL Only rows**: Amber fill (`FDE68A`)
   - **File Only rows**: Rose fill (`FECDD3`)
5. Column widths are auto-calculated based on content length (sampled from first 100 rows)
6. The workbook is saved to a BytesIO buffer and returned as a file download

The color scheme in Excel matches the web UI so the exported file looks consistent with what you see on screen.

## Troubleshooting

**Connection Errors**

| Problem | Solution |
|---------|----------|
| SQL Server not running | Run `Get-Service MSSQL*` in PowerShell. Start with `Start-Service MSSQL$SQLEXPRESS` |
| Wrong host in config | Verify `db_config.json` has the correct `host` value |
| ODBC Driver not installed | Install "ODBC Driver 17 for SQL Server" from Microsoft |
| TCP/IP not enabled | Open SQL Server Configuration Manager, enable TCP/IP under Network Configuration |
| Firewall blocking | Allow port 1433 in Windows Firewall |

**Frontend Issues**

| Problem | Solution |
|---------|----------|
| Blank white page | Ensure `postcss.config.js` exists. Delete `node_modules` and run `npm install` |
| Config not loading | Start the backend first. The frontend needs the API on port 5000 |

**Upload / Cache Errors**

| Problem | Solution |
|---------|----------|
| Parquet engine error | Ensure `pyarrow` is installed: `pip install pyarrow`. Restart the backend after installing |
| File session expired | Re-upload the file. Cached Parquet files are temporary and cleared on restart |

**Port Conflicts**

```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
taskkill /F /PID <PID_NUMBER>
```

## FAQ

**Does this work with databases other than SQL Server?**
Currently it connects to Microsoft SQL Server (any edition) via ODBC Driver 17. See the [Database Connectivity](#database-connectivity) section for instructions on switching to MySQL or PostgreSQL.

**How large a dataset can it handle?**
Tested with 1,000,000 rows across 10 columns. Key-based comparison completes in ~5-10 seconds. Smart Fingerprint mode (no keys) completes in ~30-40 seconds. The tool uses disk-based Parquet caching so memory usage stays manageable. The practical limit is around 1M rows.

**Does it modify my database?**
No. The tool only runs SELECT queries. Write operations (DROP, DELETE, UPDATE, INSERT, ALTER, EXEC, TRUNCATE) are blocked at the API level.

**Do I need to enter a username and password?**
Not for SQL Server with Windows Authentication. The tool uses the Windows user account running the Flask server. For SQL Authentication or MySQL/PostgreSQL, you would modify the connection function in app.py.

**What file formats are supported?**
`.xlsx` (Excel), `.xls` (Legacy Excel), and `.csv` (Comma-Separated Values).

**Can I compare two files without a database?**
Not in the current version. One side must be a SQL query. The sidebar has a placeholder for a future File-to-File module.

**Why did I get a PyArrow error after a fresh install?**
PyArrow must be installed (`pip install pyarrow`) and the backend must be restarted after installation. If the Flask server was started before PyArrow was installed, the import failure gets cached in memory and persists until restart.
