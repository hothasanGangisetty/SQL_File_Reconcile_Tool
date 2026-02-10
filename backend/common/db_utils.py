"""
Database configuration and connection utilities.
Shared across all modules that need SQL Server connectivity.
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
        return {"environments": []}


def get_connection_string(server, database):
    """Build ODBC connection string for Windows Authentication."""
    return (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        "Trusted_Connection=yes;"
    )


# Loaded once at import time — available as common.db_utils.CONFIG
CONFIG = load_config()
