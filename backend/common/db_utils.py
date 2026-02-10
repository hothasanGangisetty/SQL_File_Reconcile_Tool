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


def get_connection_string(server, database, port=None, username=None, password=None):
    """
    Build ODBC connection string based on auth_type in config.
    Prioritizes provided username/password over global config.
    """
    cfg = CONFIG
    odbc_driver = cfg.get('odbc_driver', 'ODBC Driver 17 for SQL Server')
    
    # Determine auth strategy
    use_sql_auth = False
    global_auth_type = cfg.get('auth_type', 'windows').lower()
    
    if username is not None or password is not None:
        use_sql_auth = True
    elif global_auth_type == 'sql':
        use_sql_auth = True

    # Build SERVER value with optional port
    server_val = server
    if port and ',' not in str(server):
        server_val = f"{server},{port}"

    conn_str = (
        f"DRIVER={{{odbc_driver}}};"
        f"SERVER={server_val};"
        f"DATABASE={database};"
    )

    if use_sql_auth:
        u = username if username is not None else cfg.get('username', '')
        p = password if password is not None else cfg.get('password', '')
        conn_str += f"UID={u};PWD={p};"
    else:
        conn_str += "Trusted_Connection=yes;"

    return conn_str


def validate_credentials(server, username, password):
    """
    Validate that the user-supplied credentials match the hardcoded config.
    Checks specifically against the instance configuration if available.
    """
    cfg = CONFIG
    
    # 1. Find if this server has specific config
    target_instance = None
    for env in cfg.get('environments', []):
        for inst in env.get('instances', []):
            if inst.get('host') == server or inst.get('server_label') == server:
                target_instance = inst
                break
        if target_instance: break
    
    # 2. Determine trusted source of truth (Instance vs Global)
    if target_instance and (target_instance.get('username') or target_instance.get('password')):
        config_user = target_instance.get('username', '')
        config_pass = target_instance.get('password', '')
    else:
        config_user = cfg.get('username', '')
        config_pass = cfg.get('password', '')
        
    return (username == config_user and password == config_pass)


# Loaded once at import time — available as common.db_utils.CONFIG
CONFIG = load_config()
