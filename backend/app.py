from flask import Flask
from flask_cors import CORS
from config import Config
from models.database import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app)

    from routes.conversations import conv_bp
    app.register_blueprint(conv_bp, url_prefix="/api/conversations")

    with app.app_context():
        db.create_all()

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)