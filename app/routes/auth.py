from flask import Blueprint, request

from app.services.auth_service import (
    register_user,
    login_user
)

from app.utils.validators import (
    validate_registration,
    validate_login
)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["POST"])
def register():

    request_data = request.get_json()

    is_valid, response_message = validate_registration(request_data)

    if not is_valid:
        return {
            "success": False,
            "message": response_message
        }, 400

    is_success, response_message = register_user(request_data)

    if not is_success:
        return {
            "success": False,
            "message": response_message
        }, 400

    return {
        "success": True,
        "message": response_message
    }, 201


@auth_bp.route("/login", methods=["POST"])
def login():

    request_data = request.get_json()

    is_valid, response_message = validate_login(request_data)

    if not is_valid:
        return {
            "success": False,
            "message": response_message
        }, 400

    is_success, response = login_user(request_data)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 401

    return {
        "success": True,
        "message": "Login Successful",
        "data": response
    }, 200