from flask import Flask
from models.db import db

# Import the model so SQLAlchemy knows it exists
from models.group import Group
from models.user import User
app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route("/")
def home():
    return "SplitMate Backend Running 🚀"

if __name__ == "__main__":
    app.run(debug=True)