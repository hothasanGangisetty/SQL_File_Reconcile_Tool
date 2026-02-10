"""
SQL File Reconcile Tool — Main Flask Application
=================================================
Slim entry point that registers modular Blueprints and serves the React UI.

Build the React app with 'npm run build' in the frontend/ directory.
CRA outputs to frontend/build/, which Flask serves as static files.

Modules:
  - common   : Shared JSON utils, DB utils, storage, connection routes
  - module_1 : SQL-to-File comparison  (active)
  - module_2 : SQL-to-SQL comparison   (coming soon)
  - module_3 : File-to-File comparison (coming soon)
"""

from flask import Flask, send_from_directory
from flask_cors import CORS
import os, atexit

from common.json_utils import safe_jsonify
from common.storage_manager import clear_cache

# ── Serve React build from frontend/build (CRA output) ──
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')

app = Flask(__name__, static_folder=FRONTEND_BUILD, static_url_path='')
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
    full_path = os.path.join(FRONTEND_BUILD, path)
    if path and os.path.isfile(full_path):
        return send_from_directory(FRONTEND_BUILD, path)
    index_path = os.path.join(FRONTEND_BUILD, 'index.html')
    if os.path.isfile(index_path):
        return send_from_directory(FRONTEND_BUILD, 'index.html')
    return safe_jsonify({"error": "Frontend not built. Run 'npm run build' in the frontend/ folder first."}, 404)


# ── Graceful shutdown: clean up temp cache ──
def _on_shutdown():
    try:
        clear_cache()
    except Exception:
        pass

atexit.register(_on_shutdown)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
