# Renderga joylashtirish

Ushbu loyiha Renderda ikkita web servis va bitta PostgreSQL baza bilan ishlaydi:

- `app-backend` - FastAPI backend va Telegram bot
- `app-frontend` - React/Vite frontend
- `app-database` - PostgreSQL baza

## Blueprint orqali o‘rnatish

1. Render panelida **New +** > **Blueprint** ni tanlang.
2. `raqamlibeznisnazorati-web/Raqamli-biznis-nazorati-RBN` repositorysini tanlang.
3. Branch sifatida `main` ni tanlang.
4. Blueprint path sifatida `render.yaml` yozing.
5. **Deploy Blueprint** tugmasini bosing.

## Render yaratadigan manzillar

```text
Frontend: https://app-frontend.onrender.com
Backend API: https://app-backend.onrender.com/api/v1
Health: https://app-backend.onrender.com/api/v1/health
```

Render boshqa domen nomlarini bersa, backenddagi `FRONTEND_BASE_URL` va `CORS_ORIGINS`, frontenddagi `VITE_API_BASE_URL` qiymatlarini haqiqiy manzillar bilan almashtiring.

## Backend Secrets

`app-backend` servisining **Environment** bo‘limiga quyidagilarni kiriting:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_CHANNEL_USERNAME
TELEGRAM_CHANNEL_ID
GEMINI_API_KEY
```

`DATABASE_URL` va `JWT_SECRET_KEY` Blueprint orqali avtomatik sozlanadi.

## Telegram bot

Telegram qiymatlari kiritilgach, bot backend ishga tushishi bilan ishlaydi. Free tarifda servis uyquga ketishi mumkin; doimiy ishlash uchun pullik doimiy ishlash tarifidan foydalanish kerak.
