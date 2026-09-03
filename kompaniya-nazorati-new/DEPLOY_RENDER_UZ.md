# Render-ga joylashtirish (o‘zbekcha)

Ushbu loyiha Render xizmatida bepul ishlashi uchun tayyor konfiguratsiya yaratildi. Quyidagi qadamlarni bajarish kifoya.

## 1. GitHub-ga push qiling

Loyiha papkasini GitHub repositoriyasiga yuklang.

## 2. Render da yangi loyiha yarating

- https://render.com ga kiring.
- "New +" tugmasini bosing.
- "Blueprint" tanlang.
- Ushbu repositoriyani tanlang.
- `render.yaml` fayli avtomatik aniqlanadi.

## 3. Dasturlarni tekshirish

Render avtomatik tarzda:

- backend xizmatini yaratadi;
- frontend statik saytini yaratadi;
- environment variable larini o‘rnatadi.

## 4. Frontend URL ni backend CORS ga qo‘shing

Agar frontend domeni boshqa nom bilan chiqsa, backend xizmatidagi `CORS_ORIGINS` ni yangilang:

```text
https://<frontend-domain>
```

Masalan:

```text
https://kompaniya-nazorati-frontend.onrender.com
```

## 5. So‘nggi tekshiruv

Backend URL ni quyidagicha tekshiring:

```text
https://<backend-domain>/api/v1/health
```

Agar javob `{"status":"ok"}` bo‘lsa, backend ishlayapti.

## 6. Nima kerak bo‘ladi?

- Frontend: Vite static site
- Backend: FastAPI + SQLite (bepul Render uchun yetarli boshlang‘ich variant)
- Telegram live majlis xabarlari uchun `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_CHANNEL_USERNAME` qiymatlarini Render-da qo‘shish kerak bo‘ladi.

## 7. Muhim eslatma

Render Free planida:

- backend har 15 daqiqada "sleep" holatiga kelishi mumkin;
- birinchi so‘rovda qayta tikilishi mumkin;
- bu juda keng tarqalgan holat.

Shuning uchun app birinchi marta Yuklanishda 20-40 soniya kutish kerak bo‘lishi mumkin.

## 8. Agar kerak bo‘lsa, endi sozlash

Render dashboardida quyidagilarni qo‘shing:

```text
ENVIRONMENT=production
JWT_SECRET_KEY=...maxsus-uchun-32-ta-belgili-kalit...
FRONTEND_BASE_URL=https://<frontend-domain>
CORS_ORIGINS=https://<frontend-domain>
TELEGRAM_BOT_TOKEN=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_CHANNEL_USERNAME=@your_channel
TELEGRAM_CHANNEL_ID=
```

Bu qiymatlar backend xizmatiga kiritiladi. Backendning startup holatida [backend/app/main.py](backend/app/main.py) ichidagi `start_telegram_bot()` avtomatik ishlaydi, shuning uchun alohida Telegram bot processi yuritish shart emas.

## 9. Yengil xulosasi

Bu loyiha Render uchun tayyor. Faqat GitHub repositoriyasini Renderga ulanib, deploy bosqichini boshlashingiz kifoya.

Agar xohlasangiz, men keyingi qadamda sizga:

1. Render uchun to‘liq `.env` faylini tayyorlayman;
2. Telegram bot uchun to‘liq sozlashni yozib beraman;
3. UI-ni Render uchun optimallashtiraman.
