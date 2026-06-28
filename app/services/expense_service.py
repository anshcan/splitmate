# app/services/expense_service.py

from app.models.db import db
from app.models.user import User
from app.models.account import Account, AccountMember
from app.models.expense import Expense, ExpenseSplit


def add_expense(current_user_id, account_id, data):
    """
    Adds an expense to an account and records how it is split.

    Two split modes:
    1. EQUAL — total is divided evenly among all specified members
    2. EXACT — each member's share is specified manually

    Expected data shape:
    {
        "description": "Domino's Pizza",
        "total_amount": 900,
        "category": "Food",             # optional
        "expense_date": "2026-06-12",   # optional, defaults to now
        "split_type": "EQUAL",          # or "EXACT"
        "split_among": [1, 2, 3],       # user IDs — for EQUAL splits
        # for EXACT splits:
        "splits": [
            { "user_id": 1, "amount": 450 },
            { "user_id": 2, "amount": 250 },
            { "user_id": 3, "amount": 200 }
        ]
    }
    """

    # Verify the account exists
    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    # Verify the current user is a member of this account
    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    # Validate required fields
    description = data.get("description", "").strip()
    total_amount = data.get("total_amount")
    split_type = data.get("split_type", "EQUAL").upper()

    if not description:
        return False, "Description is required"

    if not total_amount or float(total_amount) <= 0:
        return False, "Total amount must be greater than 0"

    total_amount = round(float(total_amount), 2)

    # Get all valid member IDs for this account — used for validation
    account_member_ids = {m.user_id for m in account.members}

    # --- Build the splits list ---

    splits = []  # Will be list of { user_id, amount }

    if split_type == "EQUAL":
        split_among = data.get("split_among", [])

        if not split_among:
            return False, "split_among is required for EQUAL splits"

        # Validate all specified users are members of this account
        for uid in split_among:
            if uid not in account_member_ids:
                return False, f"User {uid} is not a member of this account"

        # Divide evenly — round to 2 decimal places
        share = round(total_amount / len(split_among), 2)

        # Handle rounding remainder — add it to the first person's share
        # Example: ₹100 split 3 ways = ₹33.33 each = ₹99.99 total
        # The ₹0.01 remainder goes to split_among[0]
        remainder = round(total_amount - (share * len(split_among)), 2)

        for i, uid in enumerate(split_among):
            amount = share + (remainder if i == 0 else 0)
            splits.append({"user_id": uid, "amount": amount})

    elif split_type == "EXACT":
        exact_splits = data.get("splits", [])

        if not exact_splits:
            return False, "splits is required for EXACT split type"

        # Validate all users are members
        for s in exact_splits:
            if s["user_id"] not in account_member_ids:
                return False, f"User {s['user_id']} is not a member of this account"

        # Validate splits add up to total
        splits_total = round(sum(float(s["amount"]) for s in exact_splits), 2)

        if splits_total != total_amount:
            return False, f"Splits total (₹{splits_total}) must equal total amount (₹{total_amount})"

        splits = [{"user_id": s["user_id"], "amount": round(float(s["amount"]), 2)} for s in exact_splits]

    else:
        return False, "split_type must be EQUAL or EXACT"

    # --- Parse optional fields ---

    category = data.get("category", None)

    expense_date = None
    if data.get("expense_date"):
        try:
            from datetime import datetime
            expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d")
        except ValueError:
            return False, "expense_date must be in YYYY-MM-DD format"

    # --- Save to database ---

    new_expense = Expense(
        account_id=account_id,
        paid_by_user_id=current_user_id,
        total_amount=total_amount,
        description=description,
        category=category,
        expense_date=expense_date
    )

    db.session.add(new_expense)
    db.session.flush()  # Get the new expense ID before committing

    for split in splits:
        new_split = ExpenseSplit(
            expense_id=new_expense.id,
            owed_by_user_id=split["user_id"],
            amount_owed=split["amount"]
        )
        db.session.add(new_split)

    db.session.commit()

    return True, {
        "expense": new_expense.to_dict(),
        "splits": [s.to_dict() for s in new_expense.splits]
    }


def get_account_expenses(current_user_id, account_id):
    """
    Returns all expenses in an account, newest first.
    Only accessible to members of the account.
    """

    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    expenses = Expense.query.filter_by(
        account_id=account_id
    ).order_by(Expense.expense_date.desc()).all()

    return True, [
        {
            "expense": e.to_dict(),
            "splits": [s.to_dict() for s in e.splits]
        }
        for e in expenses
    ]


def get_balance_in_account(current_user_id, account_id):
    """
    Calculates what each member owes or is owed within a single account.

    This is the core balance calculation. No stored balances — pure math
    from expense splits and settlements.

    Logic:
        For every expense in this account:
            The payer is OWED money by everyone else in the splits.
            Each person in the splits OWES the payer their share.

        Then subtract any settlements between those users.

    Returns a list like:
    [
        { "user_id": 2, "username": "kanishk", "balance": 300 },
                                                 ^ positive = they owe YOU
        { "user_id": 3, "username": "rahul",   "balance": -150 }
                                                 ^ negative = you owe THEM
    ]
    """

    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    # Build a balance map: { other_user_id: net_amount }
    # Positive = they owe current_user
    # Negative = current_user owes them
    balances = {}

    expenses = Expense.query.filter_by(account_id=account_id).all()

    for expense in expenses:
        if expense.paid_by_user_id == current_user_id:
            # Current user paid — everyone else in the splits owes them
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

    # Apply settlements within this account
    from app.models.settlement import Settlement

    settlements = Settlement.query.filter_by(account_id=account_id).all()

    for settlement in settlements:
        if settlement.paid_by_user_id == current_user_id:
            # Current user paid someone — reduces what current user owes them
            uid = settlement.paid_to_user_id
            balances[uid] = balances.get(uid, 0) + settlement.amount

        elif settlement.paid_to_user_id == current_user_id:
            # Someone paid current user — reduces what they owe current user
            uid = settlement.paid_by_user_id
            balances[uid] = balances.get(uid, 0) - settlement.amount

    # Build the response with usernames attached
    result = []
    for uid, balance in balances.items():
        user = User.query.get(uid)
        result.append({
            "user_id": uid,
            "username": user.username,
            "balance": round(balance, 2)
        })

    return True, result

def edit_expense(current_user_id, account_id, expense_id, data):
    """
    Edits an existing expense.

    Only the person who originally paid can edit the expense.

    Changed fields:
    - description
    - total_amount
    - category
    - expense_date
    - split_type and splits (recalculates division)

    All balances automatically recalculate since we delete old splits
    and create new ones.
    """

    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    # Get the expense
    expense = Expense.query.filter_by(
        id=expense_id,
        account_id=account_id
    ).first()

    if not expense:
        return False, "Expense not found"

    # Only the person who paid can edit
    if expense.paid_by_user_id != current_user_id:
        return False, "Only the person who paid can edit this expense"

    # Validate and parse new data
    description = data.get("description", expense.description).strip()
    total_amount = data.get("total_amount", expense.total_amount)
    split_type = data.get("split_type", "EQUAL").upper()

    if not description:
        return False, "Description is required"

    if not total_amount or float(total_amount) <= 0:
        return False, "Total amount must be greater than 0"

    total_amount = round(float(total_amount), 2)

    # Get all valid member IDs for validation
    account_member_ids = {m.user_id for m in account.members}

    # Build new splits
    splits = []

    if split_type == "EQUAL":
        split_among = data.get("split_among", [])

        if not split_among:
            return False, "split_among is required for EQUAL splits"

        for uid in split_among:
            if uid not in account_member_ids:
                return False, f"User {uid} is not a member of this account"

        share = round(total_amount / len(split_among), 2)
        remainder = round(total_amount - (share * len(split_among)), 2)

        for i, uid in enumerate(split_among):
            amount = share + (remainder if i == 0 else 0)
            splits.append({"user_id": uid, "amount": amount})

    elif split_type == "EXACT":
        exact_splits = data.get("splits", [])

        if not exact_splits:
            return False, "splits is required for EXACT split type"

        for s in exact_splits:
            if s["user_id"] not in account_member_ids:
                return False, f"User {s['user_id']} is not a member of this account"

        splits_total = round(sum(float(s["amount"]) for s in exact_splits), 2)

        if splits_total != total_amount:
            return False, f"Splits total (₹{splits_total}) must equal total amount (₹{total_amount})"

        splits = [{"user_id": s["user_id"], "amount": round(float(s["amount"]), 2)} for s in exact_splits]

    else:
        return False, "split_type must be EQUAL or EXACT"

    # Update the expense
    expense.description = description
    expense.total_amount = total_amount
    expense.category = data.get("category", expense.category)

    if data.get("expense_date"):
        try:
            from datetime import datetime
            expense.expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d")
        except ValueError:
            return False, "expense_date must be in YYYY-MM-DD format"

    # Delete all old splits
    ExpenseSplit.query.filter_by(expense_id=expense_id).delete()

    # Create new splits
    for split in splits:
        new_split = ExpenseSplit(
            expense_id=expense.id,
            owed_by_user_id=split["user_id"],
            amount_owed=split["amount"]
        )
        db.session.add(new_split)

    db.session.commit()

    return True, {
        "expense": expense.to_dict(),
        "splits": [s.to_dict() for s in expense.splits]
    }


def delete_expense(current_user_id, account_id, expense_id):
    """
    Deletes an expense from an account.

    Only the person who paid can delete.

    When an expense is deleted:
    - All ExpenseSplits are cascade-deleted
    - All balances automatically recalculate (no stored balances)
    - Timeline updates (expense disappears)

    Example: Ansh deletes the Pizza expense.
    Aastha's balance drops from ₹1450 to ₹1000 (just the hotel now).
    """

    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not membership:
        return False, "You are not a member of this account"

    # Get the expense
    expense = Expense.query.filter_by(
        id=expense_id,
        account_id=account_id
    ).first()

    if not expense:
        return False, "Expense not found"

    # Only the person who paid can delete
    if expense.paid_by_user_id != current_user_id:
        return False, "Only the person who paid can delete this expense"

    db.session.delete(expense)
    db.session.commit()

    return True, "Expense deleted"