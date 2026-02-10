"""
Common API Routes — shared across all modules.
Handles: environment config, DB connection testing.
"""

from flask import Blueprint, request
import pyodbc

from common.json_utils import safe_jsonify
from common.db_utils import CONFIG

common_bp = Blueprint('common', __name__)


@common_bp.route('/api/config', methods=['GET'])
def get_config():
    """Returns the environment hierarchy for the frontend dropdowns."""
    return safe_jsonify(CONFIG)


@common_bp.route('/api/connect', methods=['POST'])
def test_connection():
    """
    Tests connection to SQL Server using Windows Authentication.
    Expects JSON: { "server": "1.2.3.4", "database": "MyDB" }
    """
    data = request.json
    server = data.get('server')
    database = data.get('database')

    if not server or not database:
        return safe_jsonify({"error": "Missing server or database parameters"}, 400)

    # Connection String for Windows Auth (Trusted Connection)
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        "Trusted_Connection=yes;"
    )

    try:
        # Check installed drivers for debugging
        drivers = [x for x in pyodbc.drivers() if 'SQL Server' in x]

        # Test connection with a short timeout
        conn = pyodbc.connect(conn_str, timeout=5)
        conn.close()
        return safe_jsonify({
            "status": "success",
            "message": f"Successfully connected to {database} on {server}",
            "info": "Authenticated via Windows Trusted Connection"
        })

    except pyodbc.Error as ex:
        # Extract SQL State if available
        sqlstate = ex.args[0] if ex.args else 'UNKNOWN'
        error_msg = str(ex)

        # Detailed Error Diagnosis
        detailed_reason = "An unexpected error occurred during connection."

        if '08001' in str(ex) or '08001' in str(sqlstate):
            detailed_reason = (
                "Unreachable Server (Network/Instance Error). "
                "Possible causes: "
                "1. The server IP/Hostname is incorrect. "
                "2. SQL Server is not running on the target. "
                "3. Firewall is blocking port 1433. "
                "4. SQL Browser service is down."
            )
        elif '28000' in str(ex) or '28000' in str(sqlstate):
            detailed_reason = (
                "Authentication Failed. "
                "You are using Windows Authentication (Trusted_Connection=yes). "
                "Your current Windows User does not have permission to access this database. "
                "Please Request Access or check if you are logged in as the correct user."
            )
        elif 'HYT00' in str(ex) or 'HYT00' in str(sqlstate):
            detailed_reason = (
                "Connection Timeout. "
                "The server exists but took too long to respond. "
                "The network might be slow or the server is under heavy load."
            )

        return safe_jsonify({
            "status": "error",
            "code": sqlstate,
            "message": detailed_reason,
            "raw_error": error_msg,
            "available_drivers": drivers
        }, 500)
    except Exception as e:
        return safe_jsonify({"status": "error", "message": str(e)}, 500)
