"""
Module 3: File-to-File Comparison Routes  (Placeholder)
Compare two uploaded files (CSV/Excel) against each other.
"""

from flask import Blueprint
from common.json_utils import safe_jsonify

m3_bp = Blueprint('module_3', __name__)


@m3_bp.route('/api/m3/status', methods=['GET'])
def module_status():
    """Health-check / placeholder for Module 3."""
    return safe_jsonify({
        "module": "File-to-File",
        "status": "coming_soon",
        "message": "Module 3 is under development. File-to-File comparison will be available in a future release."
    })
