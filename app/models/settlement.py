# app/models/settlement.py

from datetime import datetime
from .db import db


class Settlement(db.Model):
    __tablename__ = "settlements"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    paid_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    paid_to_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.String(255), nullable=True)
    settled_at = db.Column(db.DateTime, default=datetime.utcnow)

    account = db.relationship("Account", back_populates="settlements")
    paid_by = db.relationship("User", foreign_keys=[paid_by_user_id])
    paid_to = db.relationship("User", foreign_keys=[paid_to_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "paid_by_user_id": self.paid_by_user_id,
            "paid_to_user_id": self.paid_to_user_id,
            "amount": self.amount,
            "note": self.note,
            "settled_at": self.settled_at.isoformat(),
        }

    def __repr__(self):
        return f"<Settlement {self.id} | ₹{self.amount} from user {self.paid_by_user_id} to user {self.paid_to_user_id}>"