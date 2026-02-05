<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Flask-REST_API-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL_Server-Express-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

# 🔍 SQL-to-File Reconciliation Tool

> **A web-based data reconciliation tool built for QA Testing Teams.**
> Compare SQL Server query results against local Excel/CSV files — instantly spot mismatches, missing rows, and extra records in a clean categorized view.

---

## 📋 Table of Contents

- [What Does This Tool Do?](#-what-does-this-tool-do)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [How to Use — Step by Step](#-how-to-use--step-by-step)
- [Configuring Your Databases](#-configuring-your-databases)
- [Test Data (Included)](#-test-data-included)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)

---

## 💡 What Does This Tool Do?

In QA testing, you often need to verify that data in a **database** matches data in an **Excel/CSV file** (or vice versa). Doing this manually is slow, error-prone, and painful for large datasets.

This tool automates that process:

```
┌──────────────┐         ┌──────────────┐
│  SQL Server  │         │  Excel/CSV   │
│   (Source)   │◄──────►│    (File)     │
└──────┬───────┘         └──────┬───────┘
       │                        │
       └──────────┬─────────────┘
                  ▼
        ┌─────────────────┐
        │  Comparison     │
        │    Engine       │
        └────────┬────────┘
                 ▼
   ┌─────────────────────────────┐
   │  📊 Categorized Results     │
   │                             │
   │  🔶 Mismatched Rows (Pre/Post)  │
   │  🟡 Missing from File       │
   │  🔴 Extra in File           │
   └─────────────────────────────┘
```

**Example Use Case:**
- You have a `Payments` table in SQL with 15 rows
- You have an Excel file exported from another system
- Run the tool → it instantly shows you which rows differ, which are missing, and which are extra

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔗 **Windows Authentication** | Connects to SQL Server using your current Windows login — no passwords needed |
| 📂 **Excel & CSV Upload** | Upload `.xlsx`, `.xls`, or `.csv` files directly from your machine |
| 🗺️ **Smart Column Mapping** | Map SQL columns to File columns even when they have different names (e.g., `CustomerName` → `Name`) |
| 🔑 **Key-Based Matching** | Select primary keys for intelligent row matching (e.g., match by `PaymentID`) |
| 📊 **Sequential Matching** | No keys? It compares Row 1 vs Row 1, Row 2 vs Row 2 automatically |
| 🔶 **Pre/Post Display** | Mismatched rows shown as paired **pre** (SQL value) and **post** (File value) rows |
| 📑 **Categorized Results** | Three collapsible tables: **Mismatched**, **Missing (SQL only)**, **Extra (File only)** |
| 🔴 **Cell-Level Highlighting** | Individual cells that differ are highlighted in red |
| 📥 **CSV Export** | Download comparison results to CSV with one click |
| 💾 **Disk-Based Caching** | Results stored as Parquet files — handles large datasets without running out of memory |
| 🛡️ **SQL Safety** | Blocks dangerous queries (DROP, DELETE, UPDATE, etc.) — read-only operations only |
| 🌐 **Cascading Dropdowns** | Environment → Server → Database navigation from a single config file |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite 5** | Build tool & dev server (fast HMR) |
| **Tailwind CSS 3** | Utility-first styling |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Runtime |
| **Flask** | REST API web framework |
| **Pandas** | Data manipulation & comparison engine |
| **PyODBC** | SQL Server connectivity via ODBC |
| **PyArrow** | Parquet file read/write for disk caching |
| **OpenPyXL** | Excel file parsing |

---

## 📁 Project Structure

```
SQL_File_Reconcile_Tool/
│
├── README.md                     ← You are here
│
├── backend/                      ← Python Flask API
│   ├── app.py                    ← Main Flask server (all API routes)
│   ├── comparison_engine.py      ← Core comparison logic (key-based & sequential)
│   ├── storage_manager.py        ← Parquet disk-cache manager
│   ├── db_config.json            ← Database connection configuration
│   ├── requirements.txt          ← Python dependencies
│   └── temp_cache/               ← Auto-created cache directory
│       ├── uploads/              ← Uploaded file cache (Parquet)
│       └── results/              ← Comparison result cache (Parquet)
│
├── frontend/                     ← React UI
│   ├── index.html                ← Entry HTML
│   ├── package.json              ← Node.js dependencies
│   ├── vite.config.js            ← Vite configuration
│   ├── tailwind.config.js        ← Tailwind CSS configuration
│   ├── postcss.config.js         ← PostCSS configuration
│   └── src/
│       ├── main.jsx              ← React entry point
│       ├── App.jsx               ← Main app (4-step wizard)
│       ├── index.css             ← Global styles + Tailwind imports
│       └── components/
│           ├── ConnectionPanel.jsx   ← Step 1: Environment/Server/DB picker
│           ├── DataIngestPanel.jsx   ← Step 2: SQL query + File upload
│           ├── ValidationPanel.jsx   ← Step 3: Column mapping + Key selection
│           └── ResultsPanel.jsx      ← Step 4: Categorized comparison results
│
└── test_data/                    ← Sample Excel files for testing
    ├── PayDB_Payments.xlsx             (exact match)
    ├── PayDB_Payments_MODIFIED.xlsx    (has deliberate mismatches)
    ├── UserMaster_Users.xlsx           (exact match)
    ├── UserMaster_Users_MODIFIED.xlsx  (has deliberate mismatches)
    ├── UAT_Core_Orders.xlsx            (exact match)
    ├── UAT_Core_Orders_MODIFIED.xlsx   (has deliberate mismatches)
    └── ... (12 more exact-match exports)
```

---

## ✅ Prerequisites

Before you begin, make sure you have the following installed on your **Windows** machine:

### 1. Python 3.10 or higher
```
Download: https://www.python.org/downloads/
```
Verify installation:
```bash
python --version
```

### 2. Node.js 18 or higher
```
Download: https://nodejs.org/
```
Verify installation:
```bash
node --version
npm --version
```

### 3. ODBC Driver 17 for SQL Server
This is **required** for the Python backend to talk to SQL Server.
```
Download: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
```
To check if it's already installed, run in PowerShell:
```powershell
Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
```
You should see `ODBC Driver 17 for SQL Server` in the list.

### 4. SQL Server (Express or any edition)
You need a running SQL Server instance with databases to query.
- **SQL Server Express** (free): https://www.microsoft.com/en-us/sql-server/sql-server-downloads

To verify your SQL Server is running:
```powershell
Get-Service | Where-Object { $_.Name -like "*SQL*" }
```
Look for `MSSQL$SQLEXPRESS` (or your instance name) with status **Running**.

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd SQL_File_Reconcile_Tool
```

### Step 2: Backend Setup

```bash
cd backend

# (Recommended) Create a virtual environment
python -m venv venv

# Activate it
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install Node.js dependencies
npm install
```

### Step 4: Configure Your Database Connections

Edit `backend/db_config.json` to point to **your** SQL Server instances. See [Configuring Your Databases](#-configuring-your-databases) below for details.

---

## ▶️ Running the Application

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Start Backend (Flask API)

```bash
cd backend
python app.py
```

You should see:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### Terminal 2 — Start Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.4.x  ready in 400ms

  ➜  Local:   http://localhost:5173/
```

### Open the App

Open your browser and go to:
```
http://localhost:5173
```

> ⚠️ **Both servers must be running simultaneously.** The frontend (port 5173) calls the backend API (port 5000).

---

## 📖 How to Use — Step by Step

The application follows a **4-step wizard**:

### Step 1: Connect 🔗

1. Select an **Environment** from the dropdown (e.g., `QA_Release_1`)
2. Select a **Server** (e.g., `QA1_Payments_Server`)
3. Select a **Database** (e.g., `PayDB`)
4. Click **"Test Connection"**

> 💡 This uses **Windows Authentication** (your current Windows login). No username/password required.

If the connection is successful, you'll see a green checkmark and automatically move to Step 2.

### Step 2: Load Data 📂

This step has two panels side by side:

**Left Panel — SQL Query (Source):**
1. Write a SQL SELECT query, e.g.:
   ```sql
   SELECT * FROM Payments
   ```
2. Click **"Preview"** — you'll see the column names and first few rows

**Right Panel — File Upload (Target):**
1. Click the upload area
2. Select a `.csv`, `.xlsx`, or `.xls` file
3. The file columns and preview rows appear automatically

Once both sides have data, click **"Next: Configure Mapping"**.

### Step 3: Map Columns & Select Keys 🗺️

This is where you tell the tool **which SQL columns correspond to which File columns**.

| SQL Column (left) | → | File Column (right dropdown) |
|----|---|------|
| `PaymentID` | → | `PaymentID` *(auto-matched)* |
| `CustomerName` | → | `Name` *(select manually)* |
| `Amount` | → | `Amount` *(auto-matched)* |

**Auto-Matching:** If column names are identical (case-insensitive), they are auto-mapped.

**Key Selection (🔑):** Click the key button next to any mapped column to mark it as a **Primary Key** for matching. For example:
- Mark `PaymentID` as a key → rows are matched by PaymentID
- If you select **no keys** → rows are compared sequentially (Row 1 vs Row 1)

Click **"Run Comparison"** when ready.

### Step 4: View Results 📊

Results are displayed in **three collapsible sections**:

| Section | Color | Meaning |
|---------|-------|---------|
| 🔶 **Mismatched Rows** | Orange | Rows that exist in both but have different values. Shown as **pre** (SQL) / **post** (File) pairs with changed cells highlighted in red |
| 🟡 **Missing from File** | Amber | Rows that exist in SQL but are **not** in the file |
| 🔴 **Extra in File** | Red | Rows in the file that **don't exist** in SQL |

**Understanding Pre/Post Rows (for Mismatches):**
```
┌──────────┬───────┬────────┬──────────┐
│ PaymentID│ Name  │ Amount │ pre/post │
├──────────┼───────┼────────┼──────────┤
│ 3        │ ram   │ 14     │ pre      │  ← SQL value (highlighted yellow)
│ 3        │ ram   │ 22     │ post     │  ← File value (highlighted green)
├──────────┼───────┼────────┼──────────┤
│ 4        │ smith │ 35     │ pre      │  ← SQL had "smith"
│ 4        │ sharan│ 35     │ post     │  ← File has "sharan"
└──────────┴───────┴────────┴──────────┘
         Changed cell ^^^^ highlighted in red
```

**Export:** Click **"Export CSV"** to download all results as a CSV file.

---

## ⚙️ Configuring Your Databases

All database connections are defined in `backend/db_config.json`. The structure uses a hierarchy:

```
Environment
  └── Server Instance
        └── Database(s)
```

### Config File Format

```json
{
  "environments": [
    {
      "env_name": "QA_Release_1",
      "instances": [
        {
          "server_label": "QA1_Payments_Server",
          "host": "localhost\\SQLEXPRESS",
          "default_port": 1433,
          "databases": ["PayDB", "RiskDB"]
        },
        {
          "server_label": "QA1_User_Server",
          "host": "localhost\\SQLEXPRESS",
          "default_port": 1433,
          "databases": ["UserMaster", "AuthDB"]
        }
      ]
    }
  ]
}
```

### How to Add Your Own Servers

1. Open `backend/db_config.json`
2. Add a new object inside the `environments` array:

```json
{
  "env_name": "My_Project",
  "instances": [
    {
      "server_label": "Production DB",
      "host": "YOUR_SERVER_NAME\\INSTANCE",
      "default_port": 1433,
      "databases": ["Database1", "Database2"]
    }
  ]
}
```

3. **Save the file** and **restart the backend** (`python app.py`)
4. Your new environment will appear in the dropdown

### Common Host Formats

| Scenario | Host Value |
|----------|------------|
| Local SQL Express | `localhost\\SQLEXPRESS` |
| Local default instance | `localhost` |
| Remote server | `192.168.1.100` |
| Remote named instance | `server-name\\INSTANCE` |

> ⚠️ **Important:** Use double backslashes (`\\`) in JSON for named instances.

---

## 🧪 Test Data (Included)

The `test_data/` folder contains **15 Excel files** for testing:

### Exact-Match Files (12)
These are direct exports from the SQL tables — comparing them should produce **zero discrepancies**:

| File | Database | Table |
|------|----------|-------|
| `PayDB_Payments.xlsx` | PayDB | Payments (15 rows) |
| `PayDB_Transactions.xlsx` | PayDB | Transactions (15 rows) |
| `RiskDB_RiskAssessments.xlsx` | RiskDB | RiskAssessments (15 rows) |
| `RiskDB_FraudFlags.xlsx` | RiskDB | FraudFlags (8 rows) |
| `UserMaster_Users.xlsx` | UserMaster | Users (15 rows) |
| `UserMaster_Roles.xlsx` | UserMaster | Roles (5 rows) |
| `AuthDB_LoginAudit.xlsx` | AuthDB | LoginAudit (15 rows) |
| `AuthDB_Sessions.xlsx` | AuthDB | Sessions (10 rows) |
| `UAT_Core_Orders.xlsx` | UAT_Core | Orders (15 rows) |
| `UAT_Core_Inventory.xlsx` | UAT_Core | Inventory (8 rows) |
| `UAT_Reporting_SalesReport.xlsx` | UAT_Reporting | SalesReport (12 rows) |
| `UAT_Reporting_KPIDashboard.xlsx` | UAT_Reporting | KPIDashboard (8 rows) |

### Modified Files (3) — For Testing Mismatches
These have **deliberate changes** so you can see the tool in action:

| File | What's Different |
|------|-----------------|
| `PayDB_Payments_MODIFIED.xlsx` | Amount changed, Status changed, 1 row deleted, 1 fake row added |
| `UserMaster_Users_MODIFIED.xlsx` | Email addresses changed, 1 row removed |
| `UAT_Core_Orders_MODIFIED.xlsx` | Quantities and statuses modified |

### Quick Test Steps

1. Connect to `QA_Release_1` → `QA1_Payments_Server` → `PayDB`
2. Query: `SELECT * FROM Payments`
3. Upload: `test_data/PayDB_Payments_MODIFIED.xlsx`
4. Map all columns, set `PaymentID` as key
5. Run → You should see mismatches, missing rows, and extra rows

---

## 🔧 Troubleshooting

### "Unreachable Server" / Connection Errors

| Problem | Solution |
|---------|----------|
| SQL Server not running | Run `Get-Service MSSQL*` in PowerShell. Start with `Start-Service MSSQL$SQLEXPRESS` |
| Wrong host in config | Verify `db_config.json` has the correct `host` value |
| ODBC Driver not installed | Install "ODBC Driver 17 for SQL Server" from Microsoft |
| TCP/IP not enabled | Open **SQL Server Configuration Manager** → SQL Server Network Config → Enable TCP/IP |
| Firewall blocking | Allow port 1433 in Windows Firewall |

### Blank White Page (Frontend)

| Problem | Solution |
|---------|----------|
| Missing `postcss.config.js` | Ensure `frontend/postcss.config.js` exists with Tailwind + Autoprefixer plugins |
| `node_modules` corrupted | Delete `node_modules` folder and run `npm install` again |
| Backend not running | Start the backend first — the frontend needs the API to load config |

### Upload / Parquet Errors

| Problem | Solution |
|---------|----------|
| Serialization error on upload | The app auto-converts mixed-type columns. If it persists, ensure your file has consistent column types |
| "File session expired" | Re-upload the file — cached Parquet files are temporary |

### Port Already in Use

```powershell
# Check what's using port 5000 or 5173
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess

# Kill the process
taskkill /F /PID <PID_NUMBER>
```

---

## ❓ FAQ

**Q: Does this work with databases other than SQL Server?**
A: Currently, only **Microsoft SQL Server** (Express, Standard, Enterprise) is supported via ODBC Driver 17. Adding support for PostgreSQL/MySQL is possible with minor backend changes.

**Q: How large a dataset can it handle?**
A: The tool uses **disk-based Parquet caching** instead of in-memory storage. It's been designed to handle datasets with **100K+ rows** comfortably. For very large files (1M+ rows), performance depends on your machine's disk speed.

**Q: Does it modify my database?**
A: **No.** The tool only runs `SELECT` queries. `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `EXEC`, `TRUNCATE`, and other write operations are blocked at the API level.

**Q: Do I need to enter a username and password?**
A: **No.** The tool uses **Windows Authentication** (Trusted Connection). It uses whatever Windows user account you're currently logged in with.

**Q: Can I compare two files without a database?**
A: Not currently — one side must be a SQL query. File-to-File comparison could be added in a future update.

**Q: What file formats are supported?**
A: `.xlsx` (Excel), `.xls` (Legacy Excel), and `.csv` (Comma-Separated Values).

---

## 🗺️ Roadmap

- [x] Core comparison engine (key-based + sequential)
- [x] Pre/Post row display with cell-level highlighting
- [x] Categorized results (Mismatched / Missing / Extra)
- [x] Column mapping for differently-named columns
- [x] CSV export
- [x] Parquet disk caching
- [x] SQL injection protection
- [ ] Export to highlighted Excel (`.xlsx` with colored cells)
- [ ] Comparison history / audit log
- [ ] Dark mode
- [ ] File-to-File comparison (no database needed)
- [ ] Docker deployment support
- [ ] Progress bar for large dataset processing

---

## 📄 License

This project is for internal QA use. See your organization's policies for distribution.

---

<p align="center">
  Built with ❤️ for QA Teams
</p>
