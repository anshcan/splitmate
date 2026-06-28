# app/utils/jwt_helper.py

import jwt
import datetime
from functools import wraps
from flask import request, current_app


def generate_token(user_id):
    """
    Generates a signed JWT token for a user.

    The token contains:
    - user_id: who this token belongs to
    - iat: when it was issued (issued at)
    - exp: when it expires (7 days from now)

    The token is signed with the app's SECRET_KEY.
    If anyone tampers with the payload, the signature
    breaks and verification fails.
    """

    payload = {
        "user_id": user_id,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }

    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return token


def decode_token(token):
    """
    Decodes and verifies a JWT token.

    Returns the payload if valid.
    Raises an exception if expired or tampered with.
    """

    payload = jwt.decode(
        token,
        current_app.config["SECRET_KEY"],
        algorithms=["HS256"]
    )

    return payload


def token_required(f):
    """
    Decorator that protects any route with JWT auth.

    Usage:
        @accounts_bp.route("/", methods=["GET"])
        @token_required
        def get_accounts(current_user_id):
            ...

    How it works:
        1. Looks for Authorization header: "Bearer <token>"
        2. Extracts the token
        3. Verifies the signature and expiry
        4. Passes the user_id into the route function

    If the token is missing, expired, or invalid:
        Returns 401 Unauthorized automatically.
    """

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return {
                "success": False,
                "message": "Authorization header is missing"
            }, 401

        # Header format must be: "Bearer <token>"
        parts = auth_header.split(" ")

        if len(parts) != 2 or parts[0].lower() != "bearer":
            return {
                "success": False,
                "message": "Authorization header must be: Bearer <token>"
            }, 401

        token = parts[1]

        try:
            payload = decode_token(token)
            current_user_id = payload["user_id"]

        except jwt.ExpiredSignatureError:
            return {
                "success": False,
                "message": "Token has expired. Please log in again."
            }, 401

        except jwt.InvalidTokenError:
            return {
                "success": False,
                "message": "Invalid token. Please log in again."
            }, 401

        # Pass current_user_id as first argument to the route function
        return f(current_user_id, *args, **kwargs)

    return decorated