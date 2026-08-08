import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.database import db
from routes.messages import msg_bp
from routes.conversations import conv_bp
from routes.auth import auth_bp
from services import token_blocklist

# Built React app served by this backend (rendered in production)
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
)
print(f"[boot] FRONTEND_DIST={FRONTEND_DIST} exists={os.path.isdir(FRONTEND_DIST)}")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, supports_credentials=True, origins=Config.CORS_ORIGINS)
    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return token_blocklist.is_revoked(jwt_payload["jti"])

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "token has been revoked"}), 401

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(conv_bp, url_prefix="/api/conversations")

    app.register_blueprint(msg_bp, url_prefix="/api/conversations")
    
    with app.app_context():
        db.create_all()

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    # Serve the built frontend (single origin, like the Elixir RAG chatbot deploy)
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if os.path.isdir(FRONTEND_DIST):
            target = os.path.join(FRONTEND_DIST, path or "index.html")
            if path and os.path.isfile(target):
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, "index.html")
        return {
            "service": "conversational-ai-platform",
            "status": "degraded",
            "frontend": "not built — run `npm run build` in frontend/",
        }

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)