# SQL-to-File Reconciliation Tool

A web application that compares SQL Server data against Excel or CSV files. It finds mismatches, missing rows, and extra records, then displays them in a color-coded view with export options.

---

## What This Tool Does

1. Connect to any SQL Server database using Windows Authentication
2. Run a SELECT query to fetch data
3. Upload an Excel (.xlsx, .xls) or CSV file
4. Map columns between SQL and File (auto-matched by name)
5. Select primary key columns for accurate row matching
6. Compare the data and see results in 3 categories:
   - **Mismatched Rows**: Same key, different values (shown as Pre/Post pairs)
   - **Missing from File**: Rows in SQL but not in File
   - **Extra in File**: Rows in File but not in SQL
7. Export results to Excel (color-coded) or CSV

---

## Quick Start (No Node.js Required)

The `frontend/build` folder is included in this repository. You only need Python.

### Step 1: Install Python Dependencies

```powershell
cd SQL_File_Reconcile_Tool\backend
pip install -r requirements.txt
```

### Step 2: Run the Application

```powershell
cd SQL_File_Reconcile_Tool\backend
python app.py
```

### Step 3: Open in Browser

Go to: **http://localhost:5000**

That's it. The application is ready to use.

---

## Requirements

| Software | Required | Download Link |
|----------|----------|---------------|
| Python 3.10 or higher | Yes | https://www.python.org/downloads/ |
| ODBC Driver 17 for SQL Server | Yes | https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server |
| SQL Server (any edition) | Yes | Express, Developer, Standard, or Enterprise |
| Node.js | No | Only needed if you want to modify the frontend code |

### Check Your Setup

Run this in PowerShell to verify:

```powershell
python --version
# Should show: Python 3.10.x or higher

Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
# Should list: ODBC Driver 17 for SQL Server
```

---

## Project Structure

```
SQL_File_Reconcile_Tool/
|
|-- backend/                    Python Flask API
|   |-- app.py                  Main server (serves UI + API)
|   |-- module_1/
|   |   |-- routes.py           API endpoints for Module 1
|   |   |-- comparison_engine.py Core comparison logic
|   |-- storage_manager.py      Saves data to disk as Parquet files
|   |-- db_config.json          Database connection settings
|   |-- requirements.txt        Python packages to install
|   |-- temp_cache/             Created at runtime for temporary data
|
|-- frontend/                   React UI
|   |-- build/                  Pre-built production files (served by Flask)
|   |   |-- index.html          Main HTML file
|   |   |-- static/             JavaScript and CSS files
|   |-- src/                    Source code (only needed for development)
|   |-- package.json            Node.js config (only for development)
|
|-- test_data/                  Sample Excel files for testing
|-- README.md                   This file
|-- README_v1.md                Original version 1 documentation
|-- README_v2.md                Previous version 2 documentation
```

---

## How to Use the Application

### 1. Connect to Database

- Select your **Environment** from the dropdown
- Select your **Server** (e.g., localhost\SQLEXPRESS)
- Select your **Database**
- Click **Connect**
- Wait for green "Connected" status

### 2. Run SQL Query

- Go to the **SQL Query** tab
- Enter your SELECT query:
  ```sql
  SELECT * FROM YourTableName
  ```
- Click **Execute**
- You will see the row count and a preview in the console

### 3. Upload File

- Go to the **File Upload** tab
- Drag and drop your Excel or CSV file
- Or click to browse and select the file
- You will see the file name, row count, and column count

### 4. Map Columns

- Go to the **Keys & Mapping** tab
- The tool auto-matches columns with the same name
- Use dropdowns to manually map columns if names differ
- Click the **Key** icon next to columns that form the primary key
- Example: If each row is unique by `RecordID`, mark it as a key

### 5. Run Comparison

- Go to the **Run Comparison** tab
- Click **Run Comparison**
- Wait for the results (progress shown in console)
- View the summary:
  - Total SQL Rows
  - Total File Rows
  - Matched Rows
  - Mismatches
  - Missing from File
  - Extra in File

### 6. View Results

Results are shown in 3 collapsible sections:

**Mismatched Rows**
- Each mismatch shows 2 rows: Pre (SQL) and Post (File)
- Cells with different values are highlighted in red

**Missing from File (Only in SQL)**
- Rows that exist in SQL but not in the File
- Shown with pink background

**Extra in File (Only in File)**
- Rows that exist in File but not in SQL
- Shown with blue background

### 7. Export Results

- Click **Export Excel** to download a color-coded .xlsx file
- Click **Export CSV** to download a plain text CSV file

---

## Configure Database Connections

Edit `backend/db_config.json` to add your SQL Server connections:

```json
{
  "environments": [
    {
      "env_name": "Development",
      "instances": [
        {
          "server_label": "Local SQL Express",
          "host": "localhost\\SQLEXPRESS",
          "default_port": 1433,
          "databases": ["TestDB", "ReconcileLab"]
        }
      ]
    },
    {
      "env_name": "Production",
      "instances": [
        {
          "server_label": "Main Server",
          "host": "db-server.company.com",
          "default_port": 1433,
          "databases": ["SalesDB", "InventoryDB"]
        }
      ]
    }
  ]
}
```

**Note**: The tool uses Windows Authentication. No username or password is stored.

---

## Key Features

| Feature | Description |
|---------|-------------|
| Windows Authentication | Uses your Windows login to connect to SQL Server |
| Excel and CSV Support | Accepts .xlsx, .xls, and .csv files |
| Auto Column Mapping | Matches columns by name automatically |
| Key-Based Matching | Select primary keys for accurate row pairing |
| Smart Fingerprint Mode | Matches rows by content when no keys are selected |
| Pre/Post Display | Shows SQL value vs File value side by side |
| Cell Highlighting | Red highlight on cells that differ |
| Color-Coded Excel Export | Download styled Excel with row colors |
| CSV Export | Download plain text version |
| Read-Only | Only SELECT queries allowed. No data modification |
| Console Log | See all operations in the CMD-style console panel |

---

## Comparison Modes

### Key-Based Mode (Recommended)

When you select one or more key columns:
- Rows are matched by key values
- Example: Match by `RecordID` to compare the same record in both sources
- Most accurate for data with unique identifiers

### Smart Fingerprint Mode

When no keys are selected:
- Each row is converted to a hash fingerprint
- Rows with identical fingerprints are matched
- Remaining rows are paired by similarity (best match)
- Works even if row order is different

---

## Supported Data Types

| SQL Server Type | Handling |
|-----------------|----------|
| INT, BIGINT, SMALLINT | Compared as numbers |
| VARCHAR, NVARCHAR, CHAR | Compared as text (trimmed) |
| DATE | Compared as YYYY-MM-DD |
| DATETIME, DATETIME2 | Normalized to remove trailing zeros |
| SMALLDATETIME | Trailing :00 seconds removed |
| DECIMAL, FLOAT, MONEY | Trailing zeros removed (1750.00 = 1750) |
| BIT | Compared as 0 or 1 |
| NULL | Treated as empty for comparison |

---

## Troubleshooting

### "Frontend not built" Error

If you see this error:
```
{"error": "Frontend not built. Run 'npm run build' in the frontend/ folder first."}
```

The `frontend/build` folder is missing. Options:
1. Pull the latest code from git (build folder is included)
2. Or run: `cd frontend && npm install && npm run build`

### Connection Failed

If you cannot connect to SQL Server:
1. Verify SQL Server is running (check SQL Server Configuration Manager)
2. Verify ODBC Driver 17 is installed
3. Verify your Windows account has access to the database
4. Check the server name format (e.g., `localhost\SQLEXPRESS`)

### File Upload Failed

If file upload fails:
1. Check file format is .xlsx, .xls, or .csv
2. Check file size (large files may take time)
3. Check that the file is not open in Excel

### No Matches Found

If all rows show as missing or extra:
1. Verify column mapping is correct
2. Verify key columns are selected
3. Check data types match (dates, numbers)
4. Check for whitespace differences

---

## Development Mode

Only needed if you want to modify the React frontend code.

### Requirements

- Python 3.10+
- Node.js 18+

### Setup

```powershell
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend (hot-reload)
cd frontend
npm install
npm run start
```

Open http://localhost:3000 (frontend with hot-reload).

### Rebuild After Changes

```powershell
cd frontend
$env:DISABLE_ESLINT_PLUGIN='true'
npm run build
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Get database configuration |
| `/api/connect` | POST | Test database connection |
| `/api/preview_sql` | POST | Execute query and get preview |
| `/api/upload_file` | POST | Upload Excel or CSV file |
| `/api/run_comparison` | POST | Run comparison and get results |
| `/api/results_page` | GET | Get paginated results |
| `/api/export_excel` | GET | Download Excel file |
| `/api/heartbeat` | GET | Check server status |

---

## Performance

| Dataset Size | Key-Based Mode | Smart Fingerprint Mode |
|--------------|----------------|------------------------|
| 1,000 rows | 0.1 seconds | 0.2 seconds |
| 10,000 rows | 0.3 seconds | 0.8 seconds |
| 100,000 rows | 2 seconds | 8 seconds |
| 1,000,000 rows | 15 seconds | 35 seconds |

Tested with 20 columns per row.

---

## Version History

- **v3** (Current): SMALLDATETIME handling, NULL value support, build folder included
- **v2**: Single-server deployment, modular architecture
- **v1**: Initial release with basic comparison features

See `README_v1.md` and `README_v2.md` for previous versions.

---


