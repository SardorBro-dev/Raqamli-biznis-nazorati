# Railway deploy

Loyiha frontend va backendni bitta Docker servisda ishga tushiradi. Railway’da alohida frontend servis yaratish shart emas.

## O‘rnatish

1. Railway Dashboard’da **New Project** > **Deploy from GitHub repo** ni tanlang.
2. `SardorBro-dev/Raqamli-biznis-nazorati` repositorysini tanlang.
3. Service sozlamalarida **Root Directory** qiymatini `kompaniya-nazorati-new` qiling.
4. Railway loyihasiga **PostgreSQL** service/plugin qo‘shing.
5. Backend service’ning **Variables** bo‘limiga PostgreSQL service’dan `DATABASE_URL` reference qo‘shing.
6. Quyidagi secret qiymatlarni kiriting:

```text
JWT_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME
TELEGRAM_CHANNEL_ID
TELEGRAM_CHANNEL_USERNAME
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_USER_PHONE
GEMINI_API_KEY
```

`ENVIRONMENT` qiymatini `production` qilib qo‘ying. Dockerfile frontendni build qiladi, Alembic migratsiyasini bajaradi va FastAPI’ni Railway bergan `PORT`da ishga tushiradi.

## Tekshirish

Deploy tugagach, Railway service domenida quyidagi manzil `{"status":"ok"}` qaytarishi kerak:

```text
https://YOUR-RAILWAY-DOMAIN/api/v1/health
```
