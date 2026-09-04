import re
from uuid import uuid4
from typing import Literal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    start_session,
    verify_password,
)
from app.core.config import get_settings
from app.database import get_db
from app.models import User, SubscriptionPlan, RoleEnum
from app.core.telegram import has_pending_phone_code, is_phone_verified, is_telegram_phone_linked, notify_account_created, notify_channel_event, request_phone_code, verify_phone_code

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    username: str = Field(..., min_length=3, max_length=40)
    email: EmailStr
    phone: str = Field(..., min_length=13, max_length=13)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    accept_terms: bool = Field(...)


class LoginRequest(BaseModel):
    username: str
    password: str
    phone: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TelegramCodeRequest(BaseModel):
    phone: str = Field(..., min_length=13, max_length=13)


class TelegramVerifyRequest(TelegramCodeRequest):
    code: str = Field(..., min_length=12, max_length=12)


class RegistrationCheckRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=40)
    email: EmailStr
    phone: str = Field(..., min_length=13, max_length=13)


class RecoveryCompleteRequest(BaseModel):
    phone: str = Field(..., min_length=13, max_length=13)
    username: str | None = Field(default=None, min_length=3, max_length=40)
    password: str | None = Field(default=None, min_length=8)
    confirm_password: str | None = Field(default=None, min_length=8)


@router.get("/telegram/check")
def check_telegram_phone(phone: str = Query(..., min_length=13, max_length=13)):
    settings = get_settings()
    return {"verified": is_phone_verified(phone), "linked": is_telegram_phone_linked(phone), "code_required": has_pending_phone_code(phone), "bot_username": settings.telegram_bot_username}


@router.post("/register/check")
def check_registration(payload: RegistrationCheckRequest, db: Session = Depends(get_db)):
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone):
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
    if db.query(User).filter(User.username.ilike(payload.username.strip())).first():
        raise HTTPException(status_code=400, detail="Username already exists.")
    if db.query(User).filter(User.email.ilike(str(payload.email))).first():
        raise HTTPException(status_code=400, detail="Email already exists.")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=400, detail="Bu telefon raqami allaqachon ro'yxatdan o'tgan.")
    return {"available": True}


@router.post("/telegram/request-code")
async def request_telegram_code(payload: TelegramCodeRequest):
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone) or not is_telegram_phone_linked(phone):
        raise HTTPException(status_code=400, detail="Sizning ushbu raqamingiz faol emas. Telegram botga kirib kontaktni ulashib, qayta urinib ko'ring.")
    if not await request_phone_code(phone):
        raise HTTPException(status_code=503, detail="Telegram bot bilan bog'lanib bo'lmadi.")
    return {"sent": True}


@router.post("/telegram/verify")
def verify_telegram_code(payload: TelegramVerifyRequest):
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone):
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
    if not has_pending_phone_code(phone):
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi muddati tugagan yoki hali yuborilmagan.")
    if not verify_phone_code(phone, payload.code):
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi noto'g'ri.")
    return {"verified": True}


@router.post("/recovery/request-code")
async def request_recovery_code(payload: TelegramCodeRequest, db: Session = Depends(get_db)):
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone):
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
    if db.query(User).filter(User.phone == phone).first() is None:
        raise HTTPException(status_code=404, detail="Bu telefon raqami bilan ro'yxatdan o'tgan hisob topilmadi.")
    if not is_telegram_phone_linked(phone):
        raise HTTPException(status_code=400, detail="Avval ushbu telefon raqamini Telegram botga yuboring.")
    if not await request_phone_code(phone):
        raise HTTPException(status_code=503, detail="Telegram bot bilan bog'lanib bo'lmadi.")
    return {"sent": True}


@router.post("/recovery/complete")
def complete_account_recovery(payload: RecoveryCompleteRequest, db: Session = Depends(get_db)):
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone):
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
    if not is_phone_verified(phone):
        raise HTTPException(status_code=403, detail="Avval Telegram kodini tasdiqlang.")

    user = db.query(User).filter(User.phone == phone).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Bu telefon raqami bilan ro'yxatdan o'tgan hisob topilmadi.")
    if not payload.username and not payload.password:
        raise HTTPException(status_code=400, detail="Username yoki yangi parol kiriting.")
    if payload.password and payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Yangi parollar bir xil emas.")

    if payload.username:
        username = payload.username.strip()
        if not re.fullmatch(r"[A-Za-z0-9_]+", username):
            raise HTTPException(status_code=400, detail="Username faqat lotin harflari, raqam va _ belgisidan iborat bo'lishi kerak.")
        duplicate = db.query(User).filter(User.username.ilike(username), User.id != user.id).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="Bu username allaqachon band.")
        user.username = username

    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    return {"updated": True, "username": user.username, "message": "Hisob ma'lumotlari yangilandi."}


@router.get("/recovery/account")
def get_recovery_account(phone: str = Query(..., min_length=13, max_length=13), db: Session = Depends(get_db)):
    normalized_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", normalized_phone):
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri.")
    if not is_phone_verified(normalized_phone):
        raise HTTPException(status_code=403, detail="Avval Telegram kodini tasdiqlang.")
    user = db.query(User).filter(User.phone == normalized_phone).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Hisob topilmadi.")
    return {"username": user.username}


class AuthResponse(BaseModel):
    message: str
    user_id: str
    username: str
    email: EmailStr
    phone: str | None = None
    name: str | None = None
    last_name: str | None = None
    role: Literal["system_admin", "company_owner", "manager", "employee"] = "company_owner"
    token_type: str = "bearer"
    access_token: str
    refresh_token: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="Terms and conditions must be accepted.")

    username = payload.username.strip()
    phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not re.fullmatch(r"\+998\d{9}", phone):
        raise HTTPException(status_code=400, detail="Telefon raqami faqat O'zbekiston raqami bo'lishi kerak: +998 XX XXX XX XX.")
    if not is_phone_verified(phone):
        raise HTTPException(status_code=403, detail="Avval Telegram botga /start bosing va telefon raqamingizni yuboring.")
    name_parts = (payload.name or "").strip().split(" ", 1)
    if not re.fullmatch(r"[A-Za-z0-9_]+", username):
        raise HTTPException(status_code=400, detail="Username contains invalid characters.")
    if username.lower() == "admin":
        raise HTTPException(status_code=400, detail="This username is reserved.")

    existing_user = db.query(User).filter(User.username.ilike(username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists.")

    existing_email = db.query(User).filter(User.email.ilike(payload.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists.")

    existing_phone = db.query(User).filter(User.phone == phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Bu telefon raqami allaqachon ro'yxatdan o'tgan.")

    user_id = f"user_{uuid4().hex}"
    password_hash = hash_password(payload.password)
    
    new_user = User(
        id=user_id,
        username=username,
        email=payload.email,
        phone=phone,
        password_hash=password_hash,
        first_name=name_parts[0] if name_parts and name_parts[0] else None,
        last_name=name_parts[1] if len(name_parts) == 2 else None,
        role=RoleEnum.COMPANY_OWNER,
        is_active=True,
        is_verified=False,
    )
    
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if "phone" in str(error).lower():
            raise HTTPException(status_code=400, detail="Bu telefon raqami allaqachon ro'yxatdan o'tgan.") from error
        raise
    db.refresh(new_user)

    session_id = start_session(new_user.id)
    access_token = create_access_token(new_user.id, session_id=session_id)
    refresh_token = create_refresh_token(new_user.id, session_id=session_id)

    await notify_account_created(phone, new_user.username, new_user.email)
    registered_name = new_user.first_name or "Ko'rsatilmagan"
    await notify_channel_event(
        "Yangi foydalanuvchi ro'yxatdan o'tdi",
        f"Ism: {registered_name}\n"
        f"Username: {new_user.username}\n"
        f"Email: {new_user.email}\n"
        f"Telefon: {new_user.phone}",
    )

    return AuthResponse(
        message="User registered successfully.",
        user_id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        phone=new_user.phone,
        name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role.value,
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    user = db.query(User).filter(User.username.ilike(username)).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive.")
    if payload.phone:
        phone = payload.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if phone != user.phone:
            raise HTTPException(status_code=401, detail="Telefon raqami account ma'lumotlariga mos emas.")

    session_id = start_session(user.id)
    access_token = create_access_token(user.id, session_id=session_id)
    refresh_token = create_refresh_token(user.id, session_id=session_id)

    return AuthResponse(
        message="Login successful.",
        user_id=user.id,
        username=user.username,
        email=user.email,
        phone=user.phone,
        name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_payload = decode_token(payload.refresh_token)
    subject = token_payload.get("sub")
    if token_payload.get("type") != "refresh" or not subject:
        raise HTTPException(status_code=401, detail="Refresh token required.")
    from app.core.security import is_active_session
    if not is_active_session(subject, token_payload.get("jti")):
        raise HTTPException(status_code=401, detail="Sessiya boshqa qurilmada ochilgan.")

    user = db.query(User).filter(or_(User.id == subject, User.username.ilike(subject))).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive.")

    return AuthResponse(
        message="Token refreshed successfully.",
        user_id=user.id,
        username=user.username,
        email=user.email,
        phone=user.phone,
        name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        access_token=create_access_token(user.id, session_id=token_payload.get("jti")),
        refresh_token=create_refresh_token(user.id, session_id=token_payload.get("jti")),
    )
