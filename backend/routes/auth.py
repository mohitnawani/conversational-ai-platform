from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError
from models.database import db, User
from services import token_blocklist
from schemas.auth import RegisterSchema, LoginSchema

auth_bp = Blueprint("auth", __name__)


def _validation_error(e: ValidationError):
    return jsonify({
        "error": "invalid payload",
        "details": [{"field": err["loc"][0], "message": err["msg"]} for err in e.errors()],
    }), 400


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    try:
        payload = RegisterSchema(**data)
    except ValidationError as e:
        return _validation_error(e)

    email = payload.email.strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409

    user = User(email=email, password_hash=generate_password_hash(payload.password))
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    try:
        payload = LoginSchema(**data)
    except ValidationError as e:
        return _validation_error(e)

    email = payload.email.strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, payload.password):
        return jsonify({"error": "invalid email or password"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    token = get_jwt()
    ttl = token["exp"] - int(datetime.now(timezone.utc).timestamp())
    token_blocklist.revoke(token["jti"], max(ttl, 1))
    return jsonify({"message": "logged out"})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify(user.to_dict())
