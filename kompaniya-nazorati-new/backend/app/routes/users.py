import re

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, is_active_session
from app.database import get_db
from app.models import User
from app.core.telegram import is_phone_verified, is_telegram_phone_linked, notify_channel_event, notify_phone_changed

router = APIRouter(prefix="/users", tags=["users"])
_background_modes: dict[str, str] = {}

ROLE_METADATA = [
    {"name": "system_admin", "description": "Full platform administration"},
    {"name": "company_owner", "description": "Owns and manages company resources"},
    {"name": "manager", "description": "Performs company-specific management tasks"},
    {"name": "employee", "description": "Uses employee-specific features for assigned company"},
]


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    phone: str | None = None
    role: str
    first_name: str | None = None
    last_name: str | None = None
    profile_image: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None


class UserProfileUpdate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    username: str = Field(..., min_length=3, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    profile_image: str | None = None
    phone: str | None = None


class BackgroundModeUpdate(BaseModel):
    mode: str = ""


async def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Avtorizatsiya ma'lumoti kerak.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token kerak.")

    payload = decode_token(token)
    subject = payload.get("sub")
    if payload.get("type") == "refresh" or not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kirish tokeni kerak.")

    user = db.query(User).filter(or_(User.id == subject, User.username.ilike(subject))).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Foydalanuvchi hisobi faol emas.")
    if not is_active_session(subject, payload.get("jti")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bu account boshqa qurilmada ishlatilmoqda.")

    return user


@router.get("/roles")
def get_roles():
    return ROLE_METADATA


@router.get("/me/background-mode")
def get_background_mode(current_user: User = Depends(get_current_user)):
    return {"mode": _background_modes.get(current_user.id, "")}


@router.put("/me/background-mode")
def set_background_mode(payload: BackgroundModeUpdate, current_user: User = Depends(get_current_user)):
    if payload.mode not in {"", "bubbles"}:
        raise HTTPException(status_code=400, detail="Noma'lum animatsiya rejimi.")
    _background_modes[current_user.id] = payload.mode
    return {"mode": payload.mode}


@router.get("/me", response_model=UserProfile)
async def get_current_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.value,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "profile_image": current_user.profile_image,
    }


@router.patch("/me", response_model=UserProfile)
async def update_current_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    username = payload.username.strip()
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    phone = (payload.phone or "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    previous_phone = current_user.phone

    if not username or not first_name:
        raise HTTPException(status_code=400, detail="Ism va username bo'sh bo'lishi mumkin emas.")
    if not username.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Username faqat lotin harf, raqam va _ belgisidan iborat bo'lishi kerak.")

    username_owner = db.query(User).filter(User.username.ilike(username), User.id != current_user.id).first()
    if username_owner:
        raise HTTPException(status_code=400, detail="Bu username allaqachon mavjud.")

    if phone and phone != current_user.phone:
        if not re.fullmatch(r"\+998\d{9}", phone):
            raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
        if db.query(User).filter(User.phone == phone, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Bu telefon raqami allaqachon ro'yxatdan o'tgan.")
        if not is_telegram_phone_linked(phone):
            raise HTTPException(status_code=400, detail="Sizning ushbu raqamingiz faol emas. Telegram botga kirib kontaktni ulashib, qayta urinib ko'ring.")
        if not is_phone_verified(phone):
            raise HTTPException(status_code=403, detail="Telegram tasdiqlash kodi noto'g'ri yoki hali tasdiqlanmagan.")
        current_user.phone = phone

    current_user.first_name = first_name
    current_user.last_name = last_name or None
    current_user.username = username
    current_user.profile_image = payload.profile_image
    if payload.password and payload.password.strip():
        current_user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    if previous_phone and previous_phone != current_user.phone:
        await notify_phone_changed(previous_phone, current_user.phone, current_user.username, current_user.email)
    profile_name = " ".join(filter(None, [current_user.first_name, current_user.last_name])) or "Ko'rsatilmagan"
    await notify_channel_event(
        "Foydalanuvchi profili yangilandi",
        f"Username: {current_user.username}\n"
        f"Ism: {profile_name}\n"
        f"Email: {current_user.email}",
    )
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.value,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "profile_image": current_user.profile_image,
    }
