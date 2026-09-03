# Renderga joylashtirish

Render Blueprint bitta web servis va PostgreSQL bazasini avtomatik yaratadi. Frontend ham FastAPI orqali shu web servisdan ochiladi.

## 1. Blueprint orqali deploy qilish

1. GitHub repositoriyasini Renderga ulang.
2. **New +** > **Blueprint** bo‘limini tanlang.
3. `render.yaml` joylashgan repositoriyani tanlang.
4. Render ko‘rsatgan maxfiy qiymatlarni kiriting va deployni boshlang.

## 2. Kerakli maxfiy qiymatlar

Backend servisining **Environment** bo‘limida quyidagilarni to‘ldiring:

```text
JWT_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_CHANNEL_USERNAME
TELEGRAM_CHANNEL_ID
GEMINI_API_KEY
```

`DATABASE_URL` Render PostgreSQL bazasidan avtomatik olinadi.

## 3. URL lar

Blueprint quyidagi manzillardan foydalanadi:

```text
Sayt va backend: https://app-web.onrender.com
API: https://app-web.onrender.com/api/v1/health
```

Agar Render boshqa domen nomini bersa, backenddagi `FRONTEND_BASE_URL` va `CORS_ORIGINS` qiymatlarini haqiqiy URL bilan yangilang va qayta deploy qiling. Frontend API manzili `/api/v1` bo‘lib qoladi.

## 4. Telegram bot

Telegram qiymatlari kiritilgach, backend ishga tushishi bilan bot ham ishga tushadi. Bot tokeni yoki Telegram API qiymatlari bo‘lmasa, Telegram funksiyalari ishlamaydi, lekin saytning boshqa qismlari ishlashi davom etadi.
