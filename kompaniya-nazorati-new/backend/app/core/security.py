from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_active_sessions: dict[str, str] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_delta: int | None = None, session_id: str | None = None) -> str:
    if expires_delta is None:
        expires_delta = settings.jwt_access_token_expire_minutes

    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    payload = {"sub": subject, "exp": expire, "jti": session_id or uuid4().hex}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str, expires_delta: int | None = None, session_id: str | None = None) -> str:
    if expires_delta is None:
        expires_delta = settings.jwt_refresh_token_expire_days * 24 * 60

    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    payload = {"sub": subject, "exp": expire, "type": "refresh", "jti": session_id or uuid4().hex}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token noto'g'ri yoki muddati tugagan.",
        ) from exc


def start_session(subject: str) -> str:
    session_id = uuid4().hex
    _active_sessions[subject] = session_id
    return session_id


def is_active_session(subject: str, session_id: str | None) -> bool:
    return bool(session_id and _active_sessions.get(subject) == session_id)
