# app/routes/settlements.py

from flask import Blueprint, request

from app.services.settlement_service import (
    add_settlement,
    get_person_ledger,
    get_dashboard_summary
)
from app.models.account import Account, AccountMember
from app.models.settlement import Settlement
from app.utils.jwt_helper import token_required

settlements_bp = Blueprint("settlements", __name__)


@settlements_bp.route("/accounts/<int:account_id>/settlements", methods=["POST"])
@token_required
def create_settlement(current_user_id, account_id):
    """
    Record a repayment inside an account.

    Example: Aastha pays Ansh ₹1450 to fully clear her debt in Goa Trip.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body:
    {
        "paid_to_user_id": 1,
        "amount": 1450,
        "note": "GPay transfer"
    }
    """

    data = request.get_json()

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    is_success, response = add_settlement(current_user_id, account_id, data)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Settlement recorded",
        "data": response
    }, 201


@settlements_bp.route("/accounts/<int:account_id>/settlements", methods=["GET"])
@token_required
def list_settlements(current_user_id, account_id):
    """
    Get all settlements in an account, newest first.

    Expected Header:
        Authorization: Bearer <token>
    """

    account = Account.query.get(account_id)
    if not account:
        return {
            "success": False,
            "message": "Account not found"
        }, 404

    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return {
            "success": False,
            "message": "You are not a member of this account"
        }, 403

    settlements = Settlement.query.filter_by(
        account_id=account_id
    ).order_by(Settlement.settled_at.desc()).all()

    return {
        "success": True,
        "data": [s.to_dict() for s in settlements]
    }, 200


@settlements_bp.route("/ledger/<int:other_user_id>", methods=["GET"])
@token_required
def person_ledger(current_user_id, other_user_id):
    """
    Get the complete financial picture between you and one other person,
    across ALL shared accounts.

    Example: Ansh checks how much Aastha owes him in total.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_person_ledger(current_user_id, other_user_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200


@settlements_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard(current_user_id):
    """
    Get a summary of every person you share money with,
    aggregated across all accounts.

    People-first view — not accounts-first.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_dashboard_summary(current_user_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200