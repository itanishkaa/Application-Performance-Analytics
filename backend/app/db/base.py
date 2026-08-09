"""
SQLAlchemy declarative base.

Every model in app/models must import Base from here so that
Base.metadata.create_all() (called from main.py on startup) picks it up.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
