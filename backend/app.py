"""
SQL File Reconcile Tool — Main Flask Application
=================================================
Slim entry point that registers modular Blueprints and serves the React UI.

Modules:
  - common   : Shared JSON utils, DB utils, storage, connection routes
  - module_1 : SQL-to-File comparison  (active)
  - module_2 : SQL-to-SQL comparison   (coming soon)
  - module_3 : File-to-File comparison (coming soon)
"""

from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from common.json_utils import safe_jsonify

# ── Serve React build from frontend/dist ──
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app)

# ═══════════════════════════════════════════════════════════════════════════
# Register Blueprints
# ═══════════════════════════════════════════════════════════════════════════

from common.routes import common_bp
from module_1.routes import m1_bp
from module_2.routes import m2_bp
from module_3.routes import m3_bp

app.register_blueprint(common_bp)
app.register_blueprint(m1_bp)
app.register_blueprint(m2_bp)
app.register_blueprint(m3_bp)


# ── Serve React UI (catch-all route) ──
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Serve React frontend. API routes are handled by blueprints above."""
    full_path = os.path.join(FRONTEND_DIST, path)
    if path and os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIST, path)
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.isfile(index_path):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return safe_jsonify({"error": "Frontend not built. Run 'npm run build' in the frontend/ folder first."}, 404)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
