"""
Module 2: SQL-to-SQL Comparison Routes  (Placeholder)
Compare two SQL query results from the same or different databases.
"""

from flask import Blueprint
from common.json_utils import safe_jsonify

m2_bp = Blueprint('module_2', __name__)


@m2_bp.route('/api/m2/status', methods=['GET'])
def module_status():
    """Health-check / placeholder for Module 2."""
    return safe_jsonify({
        "module": "SQL-to-SQL",
        "status": "coming_soon",
        "message": "Module 2 is under development. SQL-to-SQL comparison will be available in a future release."
    })
