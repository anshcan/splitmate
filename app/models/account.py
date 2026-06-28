# app/models/account.py

import enum
import secrets
from datetime import datetime
from .db import db


class AccountType(enum.Enum):
    PERSONAL = "PERSONAL"
    GROUP = "GROUP"


class AccountRole(enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Account(db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.Enum(AccountType), nullable=False)
    invite_code = db.Column(
        db.String(16),
        unique=True,
        nullable=False,
        default=lambda: secrets.token_urlsafe(8)
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship("AccountMember", back_populates="account", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", back_populates="account", cascade="all, delete-orphan")
    settlements = db.relationship("Settlement", back_populates="account", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "invite_code": self.invite_code,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Account {self.id} | {self.name} | {self.type.value}>"


class AccountMember(db.Model):
    __tablename__ = "account_members"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.Enum(AccountRole), nullable=False, default=AccountRole.MEMBER)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("account_id", "user_id", name="uq_account_member"),
    )

    account = db.relationship("Account", back_populates="members")
    user = db.relationship("User", back_populates="account_memberships")

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "user_id": self.user_id,
            "role": self.role.value,
            "joined_at": self.joined_at.isoformat(),
        }

    def __repr__(self):
        return f"<AccountMember user={self.user_id} account={self.account_id} role={self.role.value}>"