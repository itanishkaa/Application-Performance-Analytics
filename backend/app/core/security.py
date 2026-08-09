"""
Password hashing (bcrypt) and JWT access-token creation/verification.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# Using bcrypt directly rather than passlib's CryptContext: passlib 1.7.x
# reads bcrypt's internal __about__.__version__ attribute which newer
# bcrypt releases (4.x+) no longer expose, breaking passlib's backend
# detection. Calling bcrypt directly avoids that incompatibility entirely.


def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")[:72]  # bcrypt's hard limit
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """
    subject is the value embedded in the token's "sub" claim — we use the
    user's id (as a string) so lookups on decode are a simple primary key hit.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Returns the subject (user id as string) if the token is valid, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
