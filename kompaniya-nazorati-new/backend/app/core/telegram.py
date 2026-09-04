import asyncio
import logging
import re
import secrets
import socket
import string
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import urlparse

import httpx
from telethon import TelegramClient, functions

from app.core.config import get_settings
from app.database import SessionLocal
from app.models import TelegramPhoneLink, User

logger = logging.getLogger(__name__)
_verification_codes: dict[str, tuple[str, datetime]] = {}
_telegram_chats: dict[str, int] = {}
_verified_phones: dict[str, datetime] = {}
_polling_task: asyncio.Task | None = None
_user_client: TelegramClient | None = None


def normalize_phone(phone: str) -> str:
    digits = "".join(character for character in str(phone or "") if character.isdigit())
    if digits.startswith("998"):
        digits = digits[3:]
    if len(digits) == 9:
        return "+998" + digits
    return "+" + digits if digits else ""


def is_phone_verified(phone: str) -> bool:
    normalized_phone = normalize_phone(phone)
    expires_at = _verified_phones.get(normalized_phone)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        _verified_phones.pop(normalized_phone, None)
        return False
    return True


def is_telegram_phone_linked(phone: str) -> bool:
    normalized_phone = normalize_phone(phone)
    if normalized_phone in _telegram_chats:
        return True
    with SessionLocal() as db:
        linked = db.query(TelegramPhoneLink).filter(TelegramPhoneLink.phone == normalized_phone).first()
    if linked:
        _telegram_chats[normalized_phone] = int(linked.chat_id)
    return linked is not None


def link_telegram_phone(phone: str, chat_id: int) -> None:
    normalized_phone = normalize_phone(phone)
    _telegram_chats[normalized_phone] = chat_id
    with SessionLocal() as db:
        linked = db.query(TelegramPhoneLink).filter(TelegramPhoneLink.phone == normalized_phone).first()
        if linked:
            linked.chat_id = str(chat_id)
        else:
            db.add(TelegramPhoneLink(phone=normalized_phone, chat_id=str(chat_id)))
        db.commit()


def get_linked_phone_for_chat(chat_id: int) -> str | None:
    for phone, linked_chat_id in _telegram_chats.items():
        if linked_chat_id == chat_id:
            return phone
    with SessionLocal() as db:
        linked = db.query(TelegramPhoneLink).filter(TelegramPhoneLink.chat_id == str(chat_id)).first()
    if linked:
        normalized_phone = normalize_phone(linked.phone)
        _telegram_chats[normalized_phone] = chat_id
        return normalized_phone
    return None


def has_pending_phone_code(phone: str) -> bool:
    saved = _verification_codes.get(normalize_phone(phone))
    if not saved or saved[1] < datetime.now(timezone.utc):
        _verification_codes.pop(normalize_phone(phone), None)
        return False
    return True


def verify_phone_code(phone: str, code: str) -> bool:
    normalized_phone = normalize_phone(phone)
    saved = _verification_codes.get(normalized_phone)
    if not saved or saved[1] < datetime.now(timezone.utc):
        _verification_codes.pop(normalized_phone, None)
        return False
    submitted_code = "".join(str(code or "").split())
    if len(submitted_code) != 12 or not secrets.compare_digest(saved[0], submitted_code):
        return False
    _verification_codes.pop(normalized_phone, None)
    _verified_phones[normalized_phone] = datetime.now(timezone.utc) + timedelta(minutes=10)
    return True


def create_phone_code(phone: str) -> str:
    character_sets = [string.ascii_uppercase, string.ascii_lowercase, string.digits, "!@#$%&*?"]
    code_characters = [secrets.choice(character_set) for character_set in character_sets]
    alphabet = "".join(character_sets)
    code_characters.extend(secrets.choice(alphabet) for _ in range(8))
    secrets.SystemRandom().shuffle(code_characters)
    code = "".join(code_characters)
    _verification_codes[normalize_phone(phone)] = (code, datetime.now(timezone.utc) + timedelta(minutes=10))
    return code


async def request_phone_code(phone: str) -> bool:
    normalized_phone = normalize_phone(phone)
    is_telegram_phone_linked(normalized_phone)
    chat_id = _telegram_chats.get(normalized_phone)
    token = get_settings().telegram_bot_token
    if not chat_id or not token:
        return False
    _verified_phones.pop(normalized_phone, None)
    code = create_phone_code(normalized_phone)
    async with httpx.AsyncClient(timeout=10) as client:
        await _send_message(client, token, chat_id, f"Tasdiqlash kodingiz: {code}\nBu kod 10 daqiqa amal qiladi. Kodni saytga kiriting.")
    return True


async def notify_account_created(phone: str, username: str, email: str) -> bool:
    chat_id = _telegram_chats.get(normalize_phone(phone))
    token = get_settings().telegram_bot_token
    if not chat_id or not token:
        return False
    message = (
        "Hisobingiz muvaffaqiyatli yaratildi.\n\n"
        f"Username: {username}\n"
        f"Email: {email}\n"
        f"Telefon: {normalize_phone(phone)}\n\n"
        "Saytga ushbu username va parolingiz bilan kirishingiz mumkin."
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await _send_message(client, token, chat_id, message)
        return True
    except httpx.HTTPError as error:
        logger.warning("Telegram account notification failed: %s", error)
        return False


async def notify_phone_changed(old_phone: str, new_phone: str, username: str, email: str) -> None:
    old_chat_id = _telegram_chats.get(normalize_phone(old_phone))
    new_chat_id = _telegram_chats.get(normalize_phone(new_phone))
    token = get_settings().telegram_bot_token
    if not token:
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if old_chat_id:
                await _send_message(
                    client,
                    token,
                    old_chat_id,
                    "Telefon raqamingiz o'zgartirildi. Siz hisobdan chiqdingiz. Agar bu amalni siz bajarmagan bo'lsangiz, administratorga murojaat qiling.",
                )
            if new_chat_id:
                await _send_message(
                    client,
                    token,
                    new_chat_id,
                    "Siz hisobga kirdingiz.\n\n"
                    f"Username: {username}\n"
                    f"Email: {email}\n"
                    f"Telefon: {normalize_phone(new_phone)}",
                )
    except httpx.HTTPError as error:
        logger.warning("Telegram phone change notification failed: %s", error)


async def forward_company_chat_message(company_name: str, sender_name: str, sender_username: str | None, message_text: str) -> bool:
    channel_id = get_settings().telegram_channel_id.strip()
    token = get_settings().telegram_bot_token
    if not channel_id or not token:
        return False

    company_label = escape(company_name.strip() or "Unknown company")
    sender_label = escape(sender_name.strip() or "Unknown user")
    username_label = escape(sender_username.strip()) if sender_username and sender_username.strip() else ""
    clean_message = escape(message_text.strip())

    if username_label:
        sender_display = f"<b>{sender_label}</b> (@{username_label})"
    else:
        sender_display = f"<b>{sender_label}</b>"

    text = (
        "📣 <b>Yangi kompaniya xabari</b>\n\n"
        f"🏢 <b>Kompaniya:</b> {company_label}\n"
        f"👤 <b>Kim yozdi:</b> {sender_display}\n\n"
        f"💬 <i>{clean_message}</i>"
    )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await _send_message(client, token, channel_id, text, parse_mode="HTML")
        return True
    except httpx.HTTPError as error:
        logger.warning("Telegram company message forwarding failed: %s", error)
        return False


def normalize_meeting_url(url: str | None) -> str | None:
    if not url or not url.strip():
        return None

    cleaned = url.strip()
    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        return cleaned

    hostname = parsed.hostname or ""
    if hostname in {"0.0.0.0", "::", "[::]", "::1", "localhost", "127.0.0.1"}:
        return f"http://localhost:5173{parsed.path or '/meeting-room'}{f'?{parsed.query}' if parsed.query else ''}{f'#{parsed.fragment}' if parsed.fragment else ''}"

    if hostname.startswith("192.168.") or hostname.startswith("10.") or hostname.startswith("172."):
        return f"http://localhost:5173{parsed.path or '/meeting-room'}{f'?{parsed.query}' if parsed.query else ''}{f'#{parsed.fragment}' if parsed.fragment else ''}"

    return cleaned


def get_telegram_meeting_base_url() -> str:
    configured = get_settings().frontend_base_url.strip().rstrip("/")
    if configured and not configured.startswith("http://localhost") and not configured.startswith("http://127.0.0.1") and not configured.startswith("http://0.0.0.0"):
        return configured

    candidates: list[str] = []
    try:
        hostnames = [socket.gethostname()]
        for host in hostnames:
            try:
                for family, _, _, sockaddr in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM):
                    ip = sockaddr[0]
                    if ip and not ip.startswith("127.") and not ip.startswith("169.254.") and not ip.startswith("::"):
                        candidates.append(ip)
            except OSError:
                pass
        if not candidates:
            try:
                resolved = socket.gethostbyname(socket.gethostname())
                if resolved and not resolved.startswith("127."):
                    candidates.append(resolved)
            except OSError:
                pass
    except Exception:
        pass

    if candidates:
        selected = candidates[0]
        if selected.startswith("192.168.") or selected.startswith("10.") or selected.startswith("172."):
            return f"http://{selected}:5173"

    return "http://localhost:5173"


def build_meeting_link(company_name: str, meeting_url: str | None = None) -> str | None:
    normalized = normalize_meeting_url(meeting_url)
    if normalized and normalized.strip():
        return normalized.strip()
    if not company_name or not company_name.strip():
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", company_name.lower()).strip("-") or "company"
    room_name = f"{slug}-{secrets.token_hex(3)}"
    base_url = get_telegram_meeting_base_url()
    return f"{base_url}/meeting-room?room={room_name}"


async def notify_meeting_status(company_name: str, started: bool, meeting_url: str | None = None) -> bool:
    settings = get_settings()
    if not settings.telegram_api_id or not settings.telegram_api_hash or not settings.telegram_channel_username:
        return False

    global _user_client
    status = "boshlandi" if started else "tugatildi"
    if started:
        message = f"🔴 {company_name} kanalida Telegram Live Video Chat boshlandi.\n\n👉 Qo'shilish uchun ushbu kanalning Video Chat oynasiga kiring."
    else:
        message = f"🔴 {company_name} kompaniyasida onlayn majlis {status}."

    try:
        if _user_client is None:
            _user_client = TelegramClient(settings.telegram_session_name, settings.telegram_api_id, settings.telegram_api_hash)
        if not _user_client.is_connected():
            await _user_client.connect()
        if not await _user_client.is_user_authorized():
            logger.warning("Telegram user account is not authorized; cannot create a real group video chat.")
            return False

        channel = await _user_client.get_entity(settings.telegram_channel_username.lstrip("@"))
        if started:
            await _user_client(functions.phone.CreateGroupCallRequest(
                peer=channel,
                random_id=secrets.randbits(31),
                title=f"{company_name} onlayn majlisi",
            ))
        await _user_client.send_message(channel, message)
        return True
    except Exception as error:
        logger.warning("Telegram meeting notification failed: %s", error)
        return False


async def _send_message(client: httpx.AsyncClient, token: str, chat_id: int | str, text: str, reply_markup: dict | None = None, parse_mode: str | None = None) -> None:
    payload = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    if parse_mode:
        payload["parse_mode"] = parse_mode
    await client.post(f"https://api.telegram.org/bot{token}/sendMessage", json=payload)


async def _poll_updates() -> None:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        return

    offset = 0
    async with httpx.AsyncClient(timeout=35) as client:
        while True:
            try:
                response = await client.get(
                    f"https://api.telegram.org/bot{token}/getUpdates",
                    params={"timeout": 25, "offset": offset},
                )
                response.raise_for_status()
            except (httpx.HTTPError, ValueError) as error:
                logger.warning("Telegram polling request failed: %s", error)
                await asyncio.sleep(2)
                continue
            updates = response.json().get("result", [])
            for update in updates:
                offset = max(offset, update["update_id"] + 1)
                message = update.get("message") or {}
                chat_id = message.get("chat", {}).get("id")
                if not chat_id:
                    continue

                if message.get("text", "").startswith("/start"):
                    linked_phone = get_linked_phone_for_chat(chat_id)
                    if linked_phone:
                        await _send_message(
                            client,
                            token,
                            chat_id,
                            "Telefon raqamingiz allaqachon ulangan. Hisob ma'lumotlarini ko'rish uchun tugmani bosing.",
                            {"keyboard": [[{"text": "Mening hisobim"}]], "resize_keyboard": True},
                        )
                        continue
                    await _send_message(
                        client,
                        token,
                        chat_id,
                        "Tasdiqlash uchun Telefon raqamingizni yuboring.",
                        {"keyboard": [[{"text": "Telefon raqamni yuborish", "request_contact": True}]], "resize_keyboard": True, "one_time_keyboard": True},
                    )
                    continue

                if message.get("text", "").strip() == "Mening hisobim":
                    linked_phone = get_linked_phone_for_chat(chat_id)
                    if not linked_phone:
                        await _send_message(client, token, chat_id, "Avval telefon raqamingizni ulang.")
                        continue
                    with SessionLocal() as db:
                        user = db.query(User).filter(User.phone == linked_phone).first()
                        if user is None:
                            await _send_message(client, token, chat_id, "Bu telefon raqami bilan tizimda ro'yxatdan o'tilgan hisob topilmadi.")
                            continue
                        company_names = [company.name for company in user.companies]
                        full_name = " ".join(part for part in [user.first_name, user.last_name] if part) or "Ko'rsatilmagan"
                        company_display = ", ".join(company_names) if company_names else "Hozircha kompaniya yo'q"
                        registered_username = str(user.username or "").strip().lstrip("@") or "Ko'rsatilmagan"
                        account_text = (
                            "Mening hisobim\n\n"
                            f"Ism: {full_name}\n"
                            f"Username: {registered_username}\n"
                            f"Email: {user.email}\n"
                            f"Telefon: {user.phone}\n"
                            f"Rol: {user.role.value}\n"
                            f"Holat: {'Faol' if user.is_active else 'Faol emas'}\n"
                            f"Kompaniyalar: {company_display}"
                        )
                    await _send_message(
                        client,
                        token,
                        chat_id,
                        account_text,
                        {"keyboard": [[{"text": "Mening hisobim"}]], "resize_keyboard": True},
                    )
                    continue

                contact = message.get("contact")
                if contact and contact.get("user_id") == chat_id:
                    phone = normalize_phone(contact.get("phone_number", ""))
                    if phone.startswith("+998") and len(phone) == 13:
                        linked_phone = get_linked_phone_for_chat(chat_id)
                        if linked_phone:
                            await _send_message(
                                client,
                                token,
                                chat_id,
                                "Bu Telegram hisobiga telefon raqami allaqachon ulangan. Boshqa telefon raqamini ulash mumkin emas.",
                                {"keyboard": [[{"text": "Mening hisobim"}]], "resize_keyboard": True},
                            )
                            continue
                        link_telegram_phone(phone, chat_id)
                        await _send_message(
                            client,
                            token,
                            chat_id,
                            "Telefon raqamingiz qabul qilindi. Endi boshqa raqam yuborish mumkin emas. Hisobingiz ma'lumotlarini ko'rish uchun tugmani bosing.",
                            {"keyboard": [[{"text": "Mening hisobim"}]], "resize_keyboard": True},
                        )
                    else:
                        await _send_message(client, token, chat_id, "Faqat O‘zbekiston telefon raqamini yuboring.")

            await asyncio.sleep(0.2)


async def start_telegram_bot() -> None:
    global _polling_task
    if not get_settings().telegram_bot_token:
        logger.warning("Telegram bot is disabled: TELEGRAM_BOT_TOKEN is empty.")
        return
    if _polling_task is None or _polling_task.done():
        _polling_task = asyncio.create_task(_poll_updates())


async def stop_telegram_bot() -> None:
    global _polling_task, _user_client
    if _polling_task:
        _polling_task.cancel()
        with suppress(asyncio.CancelledError):
            await _polling_task
        _polling_task = None
    if _user_client and _user_client.is_connected():
        await _user_client.disconnect()
    _user_client = None
