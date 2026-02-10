"""
Common API Routes — shared across all modules.
Handles: environment config, DB connection testing, credential validation,
         idle timeout tracking, safe disconnect.
"""

from flask import Blueprint, request
import pyodbc
import time
import threading

from common.json_utils import safe_jsonify
from common.db_utils import CONFIG, get_connection_string, validate_credentials

common_bp = Blueprint('common', __name__)

# ── Idle-timeout tracking ──
# Tracks the last activity timestamp.  A background thread checks every 60s;
# if idle_timeout_minutes have elapsed since last_activity, it marks
# the session as timed-out so the frontend can react.
_session_state = {
    'connected': False,
    'last_activity': time.time(),
    'server': None,
    'database': None,
    'port': None,
    'timed_out': False,
}
_state_lock = threading.Lock()


def _touch_activity():
    """Update the last-activity timestamp (called on every API hit)."""
    with _state_lock:
        _session_state['last_activity'] = time.time()
        _session_state['timed_out'] = False


def _idle_checker():
    """Background daemon that checks for idle timeout."""
    while True:
        time.sleep(30)  # check every 30s
        with _state_lock:
            if not _session_state['connected']:
                continue
            timeout_min = CONFIG.get('idle_timeout_minutes', 10)
            elapsed = time.time() - _session_state['last_activity']
            if elapsed > timeout_min * 60:
                _session_state['timed_out'] = True
                _session_state['connected'] = False

# Start the idle-checker daemon thread
_idle_thread = threading.Thread(target=_idle_checker, daemon=True)
_idle_thread.start()


@common_bp.route('/api/config', methods=['GET'])
def get_config():
    """Returns the environment hierarchy for the frontend dropdowns."""
    _touch_activity()
    # Return config but strip sensitive credentials
    safe_config = {
        "environments": CONFIG.get("environments", []),
        "auth_type": CONFIG.get("auth_type", "windows"),
        "idle_timeout_minutes": CONFIG.get("idle_timeout_minutes", 10),
    }
    return safe_jsonify(safe_config)


@common_bp.route('/api/connect', methods=['POST'])
def test_connection():
    """
    Tests connection to SQL Server.
    Expects JSON: { "server": "...", "database": "...", "port": 1433,
                    "username": "...", "password": "..." }
    For Windows Auth the username/password fields are ignored.
    For SQL Auth they are validated against the hardcoded config values.
    """
    _touch_activity()
    data = request.json
    server = data.get('server')
    database = data.get('database')
    port = data.get('port')
    ui_username = data.get('username', '')
    ui_password = data.get('password', '')

    if not server or not database:
        return safe_jsonify({"error": "Missing server or database parameters"}, 400)

    auth_type = CONFIG.get('auth_type', 'windows').lower()

    # ── Credential validation for SQL Auth ──
    if auth_type == 'sql':
        if not validate_credentials(ui_username, ui_password):
            return safe_jsonify({
                "status": "error",
                "message": "Invalid credentials. The username/password you entered does not match the configured values."
            }, 401)

    # Build connection string (port-aware)
    conn_str = get_connection_string(server, database, port)

    try:
        drivers = [x for x in pyodbc.drivers() if 'SQL Server' in x]

        conn = pyodbc.connect(conn_str, timeout=5)
        conn.close()

        # Mark session connected
        with _state_lock:
            _session_state['connected'] = True
            _session_state['server'] = server
            _session_state['database'] = database
            _session_state['port'] = port
            _session_state['last_activity'] = time.time()
            _session_state['timed_out'] = False

        auth_info = "Windows Trusted Connection" if auth_type == 'windows' else "SQL Server Authentication"
        return safe_jsonify({
            "status": "success",
            "message": f"Successfully connected to {database} on {server}",
            "info": f"Authenticated via {auth_info}"
        })

    except pyodbc.Error as ex:
        sqlstate = ex.args[0] if ex.args else 'UNKNOWN'
        error_msg = str(ex)

        detailed_reason = "An unexpected error occurred during connection."

        if '08001' in str(ex) or '08001' in str(sqlstate):
            detailed_reason = (
                "Unreachable Server (Network/Instance Error). "
                "Possible causes: "
                "1. The server IP/Hostname is incorrect. "
                "2. SQL Server is not running. "
                "3. Firewall is blocking the port. "
                "4. SQL Browser service is down."
            )
        elif '28000' in str(ex) or '28000' in str(sqlstate):
            detailed_reason = (
                "Authentication Failed. "
                f"Auth type: {auth_type}. "
                "Check your credentials or Windows user permissions."
            )
        elif 'HYT00' in str(ex) or 'HYT00' in str(sqlstate):
            detailed_reason = (
                "Connection Timeout. "
                "The server exists but took too long to respond."
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


@common_bp.route('/api/disconnect', methods=['POST'])
def disconnect():
    """
    Explicitly disconnect / reset the session.
    Called on manual disconnect or browser beforeunload.
    """
    with _state_lock:
        _session_state['connected'] = False
        _session_state['server'] = None
        _session_state['database'] = None
        _session_state['port'] = None
        _session_state['timed_out'] = False
    return safe_jsonify({"status": "disconnected"})


@common_bp.route('/api/heartbeat', methods=['GET'])
def heartbeat():
    """
    Frontend polls this to detect idle-timeout.
    Also refreshes the activity timer (so active users never time out).
    """
    with _state_lock:
        timed_out = _session_state['timed_out']
        connected = _session_state['connected']
    if not timed_out:
        _touch_activity()
    return safe_jsonify({
        "connected": connected,
        "timed_out": timed_out
    })


@common_bp.route('/api/activity', methods=['POST'])
def touch_activity():
    """Called by the frontend on meaningful user actions to reset idle timer."""
    _touch_activity()
    return safe_jsonify({"status": "ok"})
