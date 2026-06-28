# app/__init__.py

from flask import Flask
from config import Config

from app.models.db import db

from app.models.user import User
from app.models.account import Account, AccountMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement

from app.routes.auth import auth_bp
from app.routes.accounts import accounts_bp
from app.routes.expenses import expenses_bp
from app.routes.settlements import settlements_bp


def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(settlements_bp)

    with app.app_context():
        db.create_all()

    @app.route("/")
    def home():
        return {
            "success": True,
            "message": "Welcome to SplitMate API 🚀"
        }

    return app