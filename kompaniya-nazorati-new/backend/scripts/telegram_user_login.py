import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from telethon import TelegramClient

from app.core.config import get_settings


async def main() -> None:
    settings = get_settings()
    if not settings.telegram_api_id or not settings.telegram_api_hash:
        raise RuntimeError("TELEGRAM_API_ID and TELEGRAM_API_HASH are required.")
    if not settings.telegram_user_phone:
        raise RuntimeError("TELEGRAM_USER_PHONE is required.")

    client = TelegramClient(
        settings.telegram_session_name,
        settings.telegram_api_id,
        settings.telegram_api_hash,
    )
    await client.start(phone=settings.telegram_user_phone)
    account = await client.get_me()
    raw_channel_id = str(settings.telegram_channel_id).strip()
    target_channel_id = int(raw_channel_id[4:]) if raw_channel_id.startswith("-100") else abs(int(raw_channel_id))
    channel = None
    if settings.telegram_channel_username:
        channel = await client.get_entity(settings.telegram_channel_username.lstrip("@"))
        if getattr(channel, "id", None) != target_channel_id:
            channel = None
    async for dialog in client.iter_dialogs():
        if channel is not None:
            break
        entity = dialog.entity
        if getattr(entity, "id", None) == target_channel_id and getattr(entity, "broadcast", False):
            channel = entity
            break

    print(f"Authenticated as: {account.first_name or ''} {account.last_name or ''}".strip())
    if channel is None:
        print("Configured channel was not found in this account's dialogs.")
        print("Add this user account to the channel as a member/admin, open the channel once, then run the script again.")
        await client.disconnect()
        raise RuntimeError(f"Channel {settings.telegram_channel_id} is not accessible by this user account.")
    print(f"Channel resolved: {getattr(channel, 'title', settings.telegram_channel_id)}")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
