# app/services/timeline_service.py

from app.models.db import db
from app.models.account import Account, AccountMember
from app.models.expense import Expense
from app.models.settlement import Settlement
from datetime import datetime


def get_account_timeline(current_user_id, account_id):
    """
    Returns a chronological feed of all expenses and settlements in an account.
    Newest first (like WhatsApp or Instagram).

    Timeline shows:
    - Expenses: who paid, how much, for what, how it was split
    - Settlements: who paid who and how much

    Example response:
    {
        "account_id": 1,
        "account_name": "Goa Trip",
        "account_type": "GROUP",
        "net_balance_in_account": 1450,  # what you're owed or owe here
        "timeline": [
            {
                "type": "settlement",
                "date": "2026-06-27T22:31:06",
                "id": 1,
                "summary": "Aastha paid you ₹1000",
                "data": { settlement object }
            },
            {
                "type": "expense",
                "date": "2026-06-27T22:29:48",
                "id": 2,
                "summary": "Ansh paid ₹5000 for Hotel (split with Aastha)",
                "data": { expense object with splits }
            }
        ]
    }
    """

    # Verify account exists
    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    # Verify current user is a member
    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    # Get all expenses in this account
    expenses = Expense.query.filter_by(account_id=account_id).all()

    # Get all settlements in this account
    settlements = Settlement.query.filter_by(account_id=account_id).all()

    # Build timeline entries
    timeline_entries = []

    # Add expenses
    for expense in expenses:
        timeline_entries.append({
            "type": "expense",
            "date": expense.expense_date,
            "id": expense.id,
            "entry_id": f"expense_{expense.id}",  # unique ID for sorting if dates are same
            "summary": _build_expense_summary(expense, current_user_id),
            "data": {
                "expense": expense.to_dict(),
                "splits": [s.to_dict() for s in expense.splits]
            }
        })

    # Add settlements
    for settlement in settlements:
        timeline_entries.append({
            "type": "settlement",
            "date": settlement.settled_at,
            "id": settlement.id,
            "entry_id": f"settlement_{settlement.id}",
            "summary": _build_settlement_summary(settlement, current_user_id),
            "data": settlement.to_dict()
        })

    # Sort by date, newest first
    # If dates are identical, use entry_id for stable sorting
    timeline_entries.sort(
        key=lambda x: (x["date"], x["entry_id"]),
        reverse=True
    )

    # Calculate net balance in this account for the current user
    from app.services.expense_service import get_balance_in_account
    is_success, balance_data = get_balance_in_account(current_user_id, account_id)

    # Aggregate balance from all other users
    net_balance = 0.0
    if is_success and balance_data:
        for person in balance_data:
            net_balance += person["balance"]

    # Build the response
    return True, {
        "account_id": account.id,
        "account_name": account.name,
        "account_type": account.type.value,
        "net_balance_in_account": round(net_balance, 2),
        "timeline": timeline_entries
    }


def _build_expense_summary(expense, current_user_id):
    """
    Builds a human-readable summary of an expense.

    Examples:
    - "You paid ₹900 for Pizza"
    - "Ansh paid ₹5000 for Hotel"
    - "You paid ₹900, split among 2 people"
    """

    from app.models.user import User

    payer = User.query.get(expense.paid_by_user_id)
    payer_name = "You" if payer.id == current_user_id else payer.username

    num_splits = len(expense.splits)
    split_info = f"split among {num_splits} people" if num_splits > 1 else "split between 2 people"

    if expense.description:
        return f"{payer_name} paid ₹{expense.total_amount} for {expense.description}"
    else:
        return f"{payer_name} paid ₹{expense.total_amount} ({split_info})"


def _build_settlement_summary(settlement, current_user_id):
    """
    Builds a human-readable summary of a settlement.

    Examples:
    - "Aastha paid you ₹1000"
    - "You paid Ansh ₹500"
    - "Aastha paid Ansh ₹300"
    """

    from app.models.user import User

    payer = User.query.get(settlement.paid_by_user_id)
    recipient = User.query.get(settlement.paid_to_user_id)

    if payer.id == current_user_id:
        # You paid someone
        return f"You paid {recipient.username} ₹{settlement.amount}"
    elif recipient.id == current_user_id:
        # Someone paid you
        return f"{payer.username} paid you ₹{settlement.amount}"
    else:
        # You're observing a payment between two other people
        return f"{payer.username} paid {recipient.username} ₹{settlement.amount}"