# app/services/auth_service.py

from app.models.db import db
from app.models.user import User
from app.utils.jwt_helper import generate_token


def register_user(request_data):
    """
    Creates a new user account.
    Checks for duplicate email and username before inserting.
    Registration does not return a token — user must log in after registering.
    """

    # Check if email is already taken
    existing_email = User.query.filter_by(
        email=request_data["email"]
    ).first()

    if existing_email:
        return False, "Email already registered"

    # Check if username is already taken
    existing_username = User.query.filter_by(
        username=request_data["username"]
    ).first()

    if existing_username:
        return False, "Username already taken"

    # Create user — password hashing handled inside the model
    new_user = User(
        username=request_data["username"],
        email=request_data["email"],
    )
    new_user.set_password(request_data["password"])

    db.session.add(new_user)
    db.session.commit()

    return True, "User registered successfully"


def login_user(request_data):
    """
    Validates credentials and returns a JWT token on success.

    The token contains the user_id and expires in 7 days.
    The client must send this token in the Authorization header
    for every protected request:
        Authorization: Bearer <token>
    """

    user = User.query.filter_by(
        email=request_data["email"]
    ).first()

    # Same error for wrong email or wrong password — never reveal which
    if not user or not user.check_password(request_data["password"]):
        return False, "Invalid email or password"

    # Generate JWT token
    token = generate_token(user.id)

    return True, {
        "token": token,
        "user": user.to_dict()
    }