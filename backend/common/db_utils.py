"""
Database configuration and connection utilities.
Shared across all modules that need SQL Server connectivity.

Supports:
  - Windows Authentication (Trusted_Connection)
  - SQL Server Authentication (username/password)
  - Configurable ODBC driver version (e.g., 13, 17)
  - Port field on each instance
  - host\\instance format with port
"""

import os
import json


def load_config():
    """Load db_config.json from the backend root directory."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'db_config.json')
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"environments": [], "odbc_driver": "ODBC Driver 17 for SQL Server",
                "auth_type": "windows", "username": "", "password": "",
                "idle_timeout_minutes": 10}


def get_connection_string(server, database, port=None):
    """
    Build ODBC connection string based on auth_type in config.

    - 'windows' → Trusted_Connection=yes
    - 'sql'     → UID + PWD from config

    The server param may include instance name (e.g., 'host\\SQLEXPRESS').
    If port is given and server does NOT already contain a comma-port suffix,
    it is appended as SERVER=host\\instance,port.
    """
    cfg = CONFIG
    odbc_driver = cfg.get('odbc_driver', 'ODBC Driver 17 for SQL Server')
    auth_type = cfg.get('auth_type', 'windows').lower()

    # Build SERVER value with optional port
    server_val = server
    if port and ',' not in str(server):
        server_val = f"{server},{port}"

    conn_str = (
        f"DRIVER={{{odbc_driver}}};"
        f"SERVER={server_val};"
        f"DATABASE={database};"
    )

    if auth_type == 'sql':
        username = cfg.get('username', '')
        password = cfg.get('password', '')
        conn_str += f"UID={username};PWD={password};"
    else:
        conn_str += "Trusted_Connection=yes;"

    return conn_str


def validate_credentials(username, password):
    """
    Validate that the user-supplied credentials match the hardcoded config.
    Returns True if auth_type is 'windows' (no creds needed) or if they match.
    """
    cfg = CONFIG
    auth_type = cfg.get('auth_type', 'windows').lower()
    if auth_type == 'windows':
        return True
    return (username == cfg.get('username', '') and
            password == cfg.get('password', ''))


# Loaded once at import time — available as common.db_utils.CONFIG
CONFIG = load_config()
