import pyodbc
import sys

server = 'localhost\\SQLEXPRESS'
driver = 'ODBC Driver 17 for SQL Server'

print(f"--- Diagnosing SQL Connection to {server} ---")

# 1. Try connecting with Windows Authentication (Admin check)
print("\n[Step 1] Attempting connection via Windows Authentication (Trusted_Connection)...")
conn_str = f'DRIVER={{{driver}}};SERVER={server};Trusted_Connection=yes;DATABASE=master'

try:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    print("✅ SUCCESS: Connected via Windows Authentication.")
    
    # 2. Check Authentication Mode
    print("\n[Step 2] Checking Server Authentication Mode...")
    # IsIntegratedSecurityOnly: 1 = Windows Only, 0 = Mixed Mode (SQL + Windows)
    # Using CAST to int to avoid ODBC Type -16 (tinyint) issues with older drivers/formats
    cursor.execute("SELECT CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS INT)")
    is_windows_only = cursor.fetchval()
    
    if is_windows_only == 1:
        print("❌ ERROR: Your SQL Server is configured for 'Windows Authentication Mode' only.")
        print("   -> Authentication with username/password (like 'reader') is disabled.")
        print("   -> SOLUTION: Open SSMS > Right-click Server > Properties > Security > Select 'SQL Server and Windows Authentication mode'. Then Restart SQL Service.")
        sys.exit(1)
    else:
        print("✅ SUCCESS: Server is in Mixed Mode (supports username/password).")

    # 3. Fix/Create the 'reader' user
    print("\n[Step 3] ensuring user 'reader' exists with password 'reader'...")
    try:
        cursor.execute("SELECT name FROM sys.server_principals WHERE name = 'reader'")
        if cursor.fetchone():
            print("   -> User 'reader' exists. updating password to 'reader'...")
            cursor.execute("ALTER LOGIN [reader] WITH PASSWORD = 'reader', CHECK_POLICY = OFF")
        else:
            print("   -> Creating new login 'reader'...")
            cursor.execute("CREATE LOGIN [reader] WITH PASSWORD = 'reader', CHECK_POLICY = OFF")
        print("✅ SUCCESS: Login 'reader' configured successfully.")
        
    except Exception as e:
        print(f"❌ ERROR Configuting User: {e}")
        
    conn.close()

except pyodbc.Error as ex:
    print(f"❌ CONNECTION FAILED: {ex}")
    print("\nTroubleshooting:")
    print("1. Ensure SQL Server (SQLEXPRESS) service is running.")
    print("2. Ensure you have permissions to connect to this server.")
