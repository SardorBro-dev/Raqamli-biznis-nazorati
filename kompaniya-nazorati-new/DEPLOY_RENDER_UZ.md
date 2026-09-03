# Renderga joylashtirish

Render Blueprint backend, frontend va PostgreSQL bazasini avtomatik yaratadi.

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

Blueprint quyidagi servis nomlarini ishlatadi:

```text
Frontend: https://app-frontend.onrender.com
Backend: https://app-backend.onrender.com
API: https://app-backend.onrender.com/api/v1/health
```

Agar Render boshqa domen nomlarini bersa, backenddagi `FRONTEND_BASE_URL` va `CORS_ORIGINS`, frontenddagi `VITE_API_BASE_URL` qiymatlarini haqiqiy URL lar bilan yangilang va qayta deploy qiling.

## 4. Telegram bot

Telegram qiymatlari kiritilgach, backend ishga tushishi bilan bot ham ishga tushadi. Bot tokeni yoki Telegram API qiymatlari bo‘lmasa, Telegram funksiyalari ishlamaydi, lekin saytning boshqa qismlari ishlashi davom etadi.
