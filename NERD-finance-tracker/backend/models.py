"""Database models for the Personal Finance Tracker.

A single shared ``db`` instance is created here and initialised against the
Flask app inside ``create_app`` (see ``app.py``).
"""

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """An application user.

    Passwords are never stored in plaintext — only a salted hash produced by
    werkzeug is persisted.
    """

    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    transactions = db.relationship(
        "Transaction",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        """Hash ``password`` and store it on the model."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Return True if ``password`` matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username}

    def __repr__(self):
        return f"<User {self.username}>"


class Transaction(db.Model):
    """A single income or expense entry belonging to a user."""

    __tablename__ = "transaction"

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    category = db.Column(db.String(80), nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, index=True
    )

    def to_dict(self):
        """Return a JSON-serialisable representation of the transaction."""
        return {
            "id": self.id,
            "amount": self.amount,
            "type": self.type,
            "category": self.category,
            "date": self.date.isoformat() if self.date else None,
            "description": self.description,
            "user_id": self.user_id,
        }

    def __repr__(self):
        return f"<Transaction {self.type} {self.amount} ({self.category})>"
