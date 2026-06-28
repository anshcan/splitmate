import os


class Config:
    """
    Base configuration for the SplitMate application.
    """

    # Secret key used for sessions and security features
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "splitmate-super-secret-key-change-this"
    )

    # SQLite database (stored inside the instance folder)
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.db"

    # Disable unnecessary tracking (improves performance)
    SQLALCHEMY_TRACK_MODIFICATIONS = False