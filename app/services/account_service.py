# app/services/account_service.py
from app.models.expense import Expense
from app.models.db import db
from app.models.user import User
from app.models.account import Account, AccountMember, AccountType, AccountRole


def create_personal_account(current_user_id, other_user_email):
    """
    Creates a PERSONAL account between exactly two users.

    Example: Ansh wants to track expenses with Kanishk.
    Ansh is logged in (current_user_id).
    Kanishk is identified by his email (other_user_email).

    Rules:
    - The other user must already exist in the system.
    - A personal account between these two users must not already exist.
    - Both users get the OWNER role (no hierarchy in a personal account).
    """

    # Find the other user by email
    other_user = User.query.filter_by(email=other_user_email).first()

    if not other_user:
        return False, "No user found with that email"

    if other_user.id == current_user_id:
        return False, "You cannot create a personal account with yourself"

    # Check if a personal account already exists between these two users.
    # We do this by finding all PERSONAL accounts where current_user is a member,
    # then checking if other_user is also a member of any of those accounts.
    existing = (
        db.session.query(Account)
        .join(AccountMember, Account.id == AccountMember.account_id)
        .filter(
            Account.type == AccountType.PERSONAL,
            AccountMember.user_id == current_user_id
        )
        .all()
    )

    for account in existing:
        member_ids = [m.user_id for m in account.members]
        if other_user.id in member_ids:
            return False, "A personal account with this user already exists"

    # Create the account — name is auto-generated from both usernames
    current_user = User.query.get(current_user_id)
    account_name = f"{current_user.username} & {other_user.username}"

    new_account = Account(
        name=account_name,
        type=AccountType.PERSONAL
    )
    db.session.add(new_account)
    db.session.flush()  # Gets us the new account ID before commit

    # Add both users as OWNER
    member1 = AccountMember(
        account_id=new_account.id,
        user_id=current_user_id,
        role=AccountRole.OWNER
    )
    member2 = AccountMember(
        account_id=new_account.id,
        user_id=other_user.id,
        role=AccountRole.OWNER
    )

    db.session.add(member1)
    db.session.add(member2)
    db.session.commit()

    return True, new_account.to_dict()


def create_group_account(current_user_id, name):
    """
    Creates a GROUP account.

    The creator becomes the OWNER.
    Other members join later via invite code.

    Example: Ansh creates "Goa Trip". He's the owner.
    He shares the invite code with Rahul, Aman, Rohit.
    They join via /accounts/join endpoint (built later).
    """

    if not name or not name.strip():
        return False, "Group name is required"

    new_account = Account(
        name=name.strip(),
        type=AccountType.GROUP
    )
    db.session.add(new_account)
    db.session.flush()

    # Creator is the OWNER
    owner = AccountMember(
        account_id=new_account.id,
        user_id=current_user_id,
        role=AccountRole.OWNER
    )

    db.session.add(owner)
    db.session.commit()

    return True, new_account.to_dict()


def join_group_account(current_user_id, invite_code):
    """
    Lets a user join an existing GROUP account using its invite code.

    Rules:
    - Account must exist and be of type GROUP (can't join personal accounts).
    - User must not already be a member.
    """

    account = Account.query.filter_by(invite_code=invite_code).first()

    if not account:
        return False, "Invalid invite code"

    if account.type == AccountType.PERSONAL:
        return False, "Cannot join a personal account via invite code"

    # Check if already a member
    already_member = AccountMember.query.filter_by(
        account_id=account.id,
        user_id=current_user_id
    ).first()

    if already_member:
        return False, "You are already a member of this account"

    new_member = AccountMember(
        account_id=account.id,
        user_id=current_user_id,
        role=AccountRole.MEMBER
    )

    db.session.add(new_member)
    db.session.commit()

    return True, account.to_dict()


def get_user_accounts(current_user_id):
    """
    Returns all accounts the current user belongs to.
    Separated into personal and group for clean dashboard rendering.
    """

    memberships = AccountMember.query.filter_by(user_id=current_user_id).all()

    personal = []
    group = []

    for membership in memberships:
        account_data = membership.account.to_dict()

        if membership.account.type == AccountType.PERSONAL:
            personal.append(account_data)
        else:
            group.append(account_data)

    return True, {
        "personal": personal,
        "group": group
    }

def get_account_details(current_user_id, account_id):
    """
    Returns full details of a single account.

    Includes:
    - Account info (name, type, invite code)
    - All members with their roles
    - Your net balance in this account
    - Expense count

    Example response:
    {
        "account": {
            "id": 1,
            "name": "Goa Trip",
            "type": "GROUP",
            "invite_code": "fW8pXZGSfQ4",
            "created_at": "2026-06-27T22:19:09"
        },
        "members": [
            { "user_id": 1, "username": "ansh", "role": "owner" },
            { "user_id": 2, "username": "aastha", "role": "member" }
        ],
        "your_balance": 1000.0,     # positive = they owe you
        "expense_count": 2
    }
    """

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

    # Get all members
    members = AccountMember.query.filter_by(account_id=account_id).all()

    members_list = []
    for member in members:
        user = User.query.get(member.user_id)
        members_list.append({
            "user_id": member.user_id,
            "username": user.username,
            "email": user.email,
            "role": member.role.value,
            "joined_at": member.joined_at.isoformat()
        })

    # Get your net balance in this account
    from app.services.expense_service import get_balance_in_account
    is_success, balance_data = get_balance_in_account(current_user_id, account_id)

    your_balance = 0.0
    if is_success and balance_data:
        for person in balance_data:
            your_balance += person["balance"]

    # Count expenses
    expense_count = Expense.query.filter_by(account_id=account_id).count()

    return True, {
        "account": account.to_dict(),
        "members": members_list,
        "your_balance": round(your_balance, 2),
        "expense_count": expense_count
    }

def remove_member(current_user_id, account_id, user_id_to_remove):
    """
    Removes a member from a group account.

    Rules:
    - Only account OWNER can remove members
    - Cannot remove yourself
    - Cannot remove members from PERSONAL accounts (use delete account instead)
    - When removed, all future balance calculations exclude them

    Example: Ansh removes Aastha from Goa Trip group.
    """

    account = Account.query.get(account_id)
    if not account:
        return False, "Account not found"

    # Verify current user is a member
    current_membership = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=current_user_id
    ).first()

    if not current_membership:
        return False, "You are not a member of this account"

    # Only OWNER can remove members
    if current_membership.role != AccountRole.OWNER:
        return False, "Only account owner can remove members"

    # Cannot remove from PERSONAL accounts
    if account.type == AccountType.PERSONAL:
        return False, "Cannot remove members from a personal account"

    # Cannot remove yourself
    if user_id_to_remove == current_user_id:
        return False, "You cannot remove yourself from the account"

    # Verify the user to remove exists and is a member
    member_to_remove = AccountMember.query.filter_by(
        account_id=account_id,
        user_id=user_id_to_remove
    ).first()

    if not member_to_remove:
        return False, "User is not a member of this account"

    # Check if there are outstanding balances
    # (Optional: warn if balance exists, but still allow removal)
    from app.services.expense_service import get_balance_in_account
    is_success, balance_data = get_balance_in_account(current_user_id, account_id)

    outstanding_with_user = 0.0
    if is_success and balance_data:
        for person in balance_data:
            if person["user_id"] == user_id_to_remove:
                outstanding_with_user = person["balance"]
                break

    # Delete the membership
    db.session.delete(member_to_remove)
    db.session.commit()

    return True, {
        "message": f"User removed from account",
        "removed_user_id": user_id_to_remove,
        "outstanding_balance": round(outstanding_with_user, 2)
    }