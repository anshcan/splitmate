# app/models/expense.py

import enum
from datetime import datetime
from .db import db


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    paid_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(60), nullable=True)
    expense_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    account = db.relationship("Account", back_populates="expenses")
    paid_by = db.relationship("User", foreign_keys=[paid_by_user_id])
    splits = db.relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "paid_by_user_id": self.paid_by_user_id,
            "total_amount": self.total_amount,
            "description": self.description,
            "category": self.category,
            "expense_date": self.expense_date.isoformat(),
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Expense {self.id} | ₹{self.total_amount} | {self.description}>"


class ExpenseSplit(db.Model):
    __tablename__ = "expense_splits"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id"), nullable=False)
    owed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount_owed = db.Column(db.Float, nullable=False)

    expense = db.relationship("Expense", back_populates="splits")
    owed_by = db.relationship("User", foreign_keys=[owed_by_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "owed_by_user_id": self.owed_by_user_id,
            "amount_owed": self.amount_owed,
        }

    def __repr__(self):
        return f"<ExpenseSplit expense={self.expense_id} owed_by={self.owed_by_user_id} ₹{self.amount_owed}>"