# app/services/settlement_service.py

from app.models.db import db
from app.models.user import User
from app.models.account import Account, AccountMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement


def add_settlement(current_user_id, account_id, data):
    """
    Records a repayment from one user to another inside an account.

    Example:
        Aastha pays Ansh ₹2450 to clear her debt from Goa Trip.

    Expected data shape:
    {
        "paid_to_user_id": 1,
        "amount": 2450,
        "note": "GPay transfer"   # optional
    }
    """

    # Verify the account exists
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

    # Validate fields
    paid_to_user_id = data.get("paid_to_user_id")
    amount = data.get("amount")

    if not paid_to_user_id:
        return False, "paid_to_user_id is required"

    if not amount or float(amount) <= 0:
        return False, "Amount must be greater than 0"

    if paid_to_user_id == current_user_id:
        return False, "You cannot settle with yourself"

    # Verify the recipient is also a member of this account
    recipient_membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=paid_to_user_id
    ).first()

    if not recipient_membership:
        return False, "The recipient is not a member of this account"

    amount = round(float(amount), 2)
    note = data.get("note", None)

    new_settlement = Settlement(
        account_id=account_id,
        paid_by_user_id=current_user_id,
        paid_to_user_id=paid_to_user_id,
        amount=amount,
        note=note
    )

    db.session.add(new_settlement)
    db.session.commit()

    return True, new_settlement.to_dict()


def get_person_ledger(current_user_id, other_user_id):
    """
    The biggest feature of SplitMate.

    Returns the complete financial picture between two people
    ACROSS ALL accounts — not just one group.

    Example:
        Ansh asks: "How much does Aastha owe me total?"

        Goa Trip    Aastha owes Ansh ₹2000
        Mall        Aastha owes Ansh ₹450
        Coffee      Ansh owes Aastha ₹150
        -----------------------------------
        Net         Aastha owes Ansh ₹2300

    This aggregates across every shared account between the two users.

    Returns:
    {
        "other_user": { "id": 2, "username": "aastha" },
        "net_balance": 2300.0,       # positive = they owe you
        "breakdown": [
            {
                "account_id": 1,
                "account_name": "Goa Trip",
                "account_type": "GROUP",
                "balance": 2000.0
            },
            {
                "account_id": 2,
                "account_name": "ansh & aastha",
                "account_type": "PERSONAL",
                "balance": 300.0
            }
        ]
    }
    """

    other_user = User.query.get(other_user_id)
    if not other_user:
        return False, "User not found"

    if other_user_id == current_user_id:
        return False, "You cannot view a ledger with yourself"

    # Find all accounts where BOTH users are members
    # Step 1: get all account IDs current user belongs to
    current_user_account_ids = {
        m.account_id for m in
        AccountMember.query.filter_by(user_id=current_user_id).all()
    }

    # Step 2: get all account IDs other user belongs to
    other_user_account_ids = {
        m.account_id for m in
        AccountMember.query.filter_by(user_id=other_user_id).all()
    }

    # Step 3: intersection = shared accounts
    shared_account_ids = current_user_account_ids & other_user_account_ids

    if not shared_account_ids:
        return True, {
            "other_user": other_user.to_dict(),
            "net_balance": 0.0,
            "breakdown": []
        }

    breakdown = []
    net_balance = 0.0

    for account_id in shared_account_ids:
        account = Account.query.get(account_id)
        account_balance = 0.0

        # Calculate expense-based balance between the two users
        # in this specific account
        expenses = Expense.query.filter_by(account_id=account_id).all()

        for expense in expenses:
            if expense.paid_by_user_id == current_user_id:
                # Ansh paid — check if Aastha owes anything
                for split in expense.splits:
                    if split.owed_by_user_id == other_user_id:
                        account_balance += split.amount_owed

            elif expense.paid_by_user_id == other_user_id:
                # Aastha paid — check if Ansh owes anything
                for split in expense.splits:
                    if split.owed_by_user_id == current_user_id:
                        account_balance -= split.amount_owed

        # Apply settlements between these two users in this account
        settlements = Settlement.query.filter_by(
            account_id=account_id
        ).all()

        for settlement in settlements:
            if (settlement.paid_by_user_id == other_user_id and
                    settlement.paid_to_user_id == current_user_id):
                # Aastha paid Ansh — reduces what she owes
                account_balance -= settlement.amount

            elif (settlement.paid_by_user_id == current_user_id and
                    settlement.paid_to_user_id == other_user_id):
                # Ansh paid Aastha — reduces what he owes
                account_balance += settlement.amount

        account_balance = round(account_balance, 2)
        net_balance += account_balance

        breakdown.append({
            "account_id": account.id,
            "account_name": account.name,
            "account_type": account.type.value,
            "balance": account_balance
        })

    return True, {
        "other_user": other_user.to_dict(),
        "net_balance": round(net_balance, 2),
        "breakdown": breakdown
    }


def get_dashboard_summary(current_user_id):
    """
    Returns a summary of what every person owes you or you owe them,
    aggregated across ALL accounts.

    This powers the main dashboard — people-first, not accounts-first.

    Example response:
    {
        "summary": [
            { "user_id": 2, "username": "aastha", "net_balance": 2300.0 },
            { "user_id": 3, "username": "rahul",  "net_balance": -500.0 }
        ],
        "total_owed_to_you": 2300.0,
        "total_you_owe": 500.0
    }
    """

    # Get all accounts the current user belongs to
    memberships = AccountMember.query.filter_by(
        user_id=current_user_id
    ).all()

    # Build a balance map across all accounts: { other_user_id: net_balance }
    balances = {}

    for membership in memberships:
        account_id = membership.account_id
        expenses = Expense.query.filter_by(account_id=account_id).all()

        for expense in expenses:
            if expense.paid_by_user_id == current_user_id:
                # Current user paid — others in splits owe them
                for split in expense.splits:
                    if split.owed_by_user_id != current_user_id:
                        uid = split.owed_by_user_id
                        balances[uid] = balances.get(uid, 0) + split.amount_owed

            else:
                # Someone else paid — check if current user owes them
                for split in expense.splits:
                    if split.owed_by_user_id == current_user_id:
                        uid = expense.paid_by_user_id
                        balances[uid] = balances.get(uid, 0) - split.amount_owed

        # Apply settlements
        settlements = Settlement.query.filter_by(account_id=account_id).all()

        for settlement in settlements:
            if settlement.paid_by_user_id == current_user_id:
                uid = settlement.paid_to_user_id
                balances[uid] = balances.get(uid, 0) + settlement.amount

            elif settlement.paid_to_user_id == current_user_id:
                uid = settlement.paid_by_user_id
                balances[uid] = balances.get(uid, 0) - settlement.amount

    # Build response
    summary = []
    total_owed_to_you = 0.0
    total_you_owe = 0.0

    for uid, balance in balances.items():
        user = User.query.get(uid)
        balance = round(balance, 2)

        summary.append({
            "user_id": uid,
            "username": user.username,
            "net_balance": balance
        })

        if balance > 0:
            total_owed_to_you += balance
        else:
            total_you_owe += abs(balance)

    # Sort by absolute balance — biggest amounts first
    summary.sort(key=lambda x: abs(x["net_balance"]), reverse=True)

    return True, {
        "summary": summary,
        "total_owed_to_you": round(total_owed_to_you, 2),
        "total_you_owe": round(total_you_owe, 2)
    }