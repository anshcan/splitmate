# app/routes/accounts.py

from flask import Blueprint, request

from app.services.account_service import (
    create_personal_account,
    create_group_account,
    join_group_account,
    get_user_accounts,
    get_account_details,
    remove_member
)

from app.services.account_service import (
    create_personal_account,
    create_group_account,
    join_group_account,
    get_user_accounts,
    get_account_details
)
from app.utils.jwt_helper import token_required

accounts_bp = Blueprint("accounts", __name__, url_prefix="/accounts")


@accounts_bp.route("/personal", methods=["POST"])
@token_required
def create_personal(current_user_id):
    """
    Create a personal account with another user.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body:
    {
        "email": "aastha@example.com"
    }
    """

    data = request.get_json()

    if not data or not data.get("email"):
        return {
            "success": False,
            "message": "Email is required"
        }, 400

    is_success, response = create_personal_account(
        current_user_id,
        data["email"]
    )

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Personal account created",
        "data": response
    }, 201


@accounts_bp.route("/group", methods=["POST"])
@token_required
def create_group(current_user_id):
    """
    Create a group account.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body:
    {
        "name": "Goa Trip"
    }
    """

    data = request.get_json()

    if not data or not data.get("name"):
        return {
            "success": False,
            "message": "Group name is required"
        }, 400

    is_success, response = create_group_account(
        current_user_id,
        data["name"]
    )

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Group account created",
        "data": response
    }, 201


@accounts_bp.route("/join", methods=["POST"])
@token_required
def join_group(current_user_id):
    """
    Join a group account via invite code.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body:
    {
        "invite_code": "aB3kR9xZ"
    }
    """

    data = request.get_json()

    if not data or not data.get("invite_code"):
        return {
            "success": False,
            "message": "Invite code is required"
        }, 400

    is_success, response = join_group_account(
        current_user_id,
        data["invite_code"]
    )

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Joined group successfully",
        "data": response
    }, 200


@accounts_bp.route("/", methods=["GET"])
@token_required
def get_accounts(current_user_id):
    """
    Get all accounts for the current user.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_user_accounts(current_user_id)

    return {
        "success": True,
        "data": response
    }, 200


@accounts_bp.route("/<int:account_id>", methods=["GET"])
@token_required
def get_account_detail(current_user_id, account_id):
    """
    Get full details of a single account.

    Includes members, roles, your balance, and expense count.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_account_details(current_user_id, account_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200


@accounts_bp.route("/<int:account_id>/members/<int:user_id>", methods=["DELETE"])
@token_required
def remove_account_member(current_user_id, account_id, user_id):
    """
    Remove a member from a group account.

    Only the account OWNER can remove members.
    Cannot remove members from personal accounts.
    Cannot remove yourself.

    Expected Header:
        Authorization: Bearer <token>

    Example:
        DELETE /accounts/1/members/2
        (Ansh removes Aastha from Goa Trip)
    """

    is_success, response = remove_member(current_user_id, account_id, user_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200