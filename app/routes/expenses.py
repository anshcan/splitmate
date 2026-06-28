# app/routes/expenses.py

from flask import Blueprint, request

from app.services.expense_service import (
    add_expense,
    get_account_expenses,
    get_balance_in_account,
    edit_expense,
    delete_expense
)
from app.utils.jwt_helper import token_required

expenses_bp = Blueprint("expenses", __name__, url_prefix="/accounts/<int:account_id>/expenses")


@expenses_bp.route("/", methods=["POST"])
@token_required
def create_expense(current_user_id, account_id):
    """
    Add a new expense to an account.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body for EQUAL split:
    {
        "description": "Domino's Pizza",
        "total_amount": 900,
        "category": "Food",
        "expense_date": "2026-06-12",
        "split_type": "EQUAL",
        "split_among": [1, 2]
    }

    Expected JSON body for EXACT split:
    {
        "description": "Hotel",
        "total_amount": 5000,
        "split_type": "EXACT",
        "splits": [
            { "user_id": 1, "amount": 3000 },
            { "user_id": 2, "amount": 2000 }
        ]
    }
    """

    data = request.get_json()

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    is_success, response = add_expense(current_user_id, account_id, data)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Expense added",
        "data": response
    }, 201


@expenses_bp.route("/", methods=["GET"])
@token_required
def list_expenses(current_user_id, account_id):
    """
    Get all expenses in an account, newest first.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_account_expenses(current_user_id, account_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200


@expenses_bp.route("/balances", methods=["GET"])
@token_required
def account_balances(current_user_id, account_id):
    """
    Get net balances between the current user and every other
    member of this account.

    Positive = they owe you.
    Negative = you owe them.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = get_balance_in_account(current_user_id, account_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "data": response
    }, 200


@expenses_bp.route("/<int:expense_id>", methods=["PUT"])
@token_required
def update_expense(current_user_id, account_id, expense_id):
    """
    Edit an existing expense.

    Only the person who paid can edit.

    Expected Header:
        Authorization: Bearer <token>

    Expected JSON body (all optional — only include fields you're changing):
    {
        "description": "New description",
        "total_amount": 1000,
        "category": "Transport",
        "expense_date": "2026-06-15",
        "split_type": "EQUAL",
        "split_among": [1, 2, 3]
    }

    Or for EXACT splits:
    {
        "total_amount": 1500,
        "split_type": "EXACT",
        "splits": [
            { "user_id": 1, "amount": 750 },
            { "user_id": 2, "amount": 750 }
        ]
    }
    """

    data = request.get_json()

    if not data:
        return {
            "success": False,
            "message": "Request body is required"
        }, 400

    is_success, response = edit_expense(current_user_id, account_id, expense_id, data)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": "Expense updated",
        "data": response
    }, 200


@expenses_bp.route("/<int:expense_id>", methods=["DELETE"])
@token_required
def remove_expense(current_user_id, account_id, expense_id):
    """
    Delete an expense.

    Only the person who paid can delete.

    All associated splits are cascade-deleted.
    All balances automatically recalculate.

    Expected Header:
        Authorization: Bearer <token>
    """

    is_success, response = delete_expense(current_user_id, account_id, expense_id)

    if not is_success:
        return {
            "success": False,
            "message": response
        }, 400

    return {
        "success": True,
        "message": response
    }, 200