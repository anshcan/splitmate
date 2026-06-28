# app/utils/validators.py

import re


def validate_registration(request_data):
    """
    Validate user registration data.
    """

    # "name" → "username" to match the new User model
    required_fields = ["username", "email", "password"]

    for field in required_fields:
        if field not in request_data or not str(request_data[field]).strip():
            return False, f"{field.capitalize()} is required"

    email_pattern = r"^[^@]+@[^@]+\.[^@]+$"

    if not re.match(email_pattern, request_data["email"]):
        return False, "Invalid email format"

    if len(request_data["username"].strip()) < 3:
        return False, "Username must be at least 3 characters"

    password = request_data["password"]

    if len(password) < 8:
        return False, "Password must be at least 8 characters"

    return True, "Validation Successful"


def validate_login(request_data):
    """
    Validate user login data.
    """

    required_fields = ["email", "password"]

    for field in required_fields:
        if field not in request_data or not str(request_data[field]).strip():
            return False, f"{field.capitalize()} is required"

    email_pattern = r"^[^@]+@[^@]+\.[^@]+$"

    if not re.match(email_pattern, request_data["email"]):
        return False, "Invalid email format"

    return True, "Validation Successful"