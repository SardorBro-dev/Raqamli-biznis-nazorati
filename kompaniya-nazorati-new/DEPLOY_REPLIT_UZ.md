# Replitga joylashtirish

Ushbu loyiha Replitda frontend va FastAPI backend bilan birgalikda ishga tushadi.

## 1. Replitga import qilish

GitHub repositoriysini Replitga import qiling yoki loyiha fayllarini yangi Replga yuklang.

## 2. Ishga tushirish

`.replit` fayli mavjud bo‘lsa, Replit avtomatik ravishda quyidagi buyruqni ishlatadi:

```bash
npm run replit:dev
```

Bu buyruq backend kutubxonalarini o‘rnatadi, frontend kutubxonalarini o‘rnatadi va ikkala serverni ishga tushiradi.

## 3. Environment variable lar

Replit Secrets bo‘limida quyidagilarni kiriting:

```text
ENVIRONMENT=production
JWT_SECRET_KEY=kamida-32-belgidan-iborat-maxfiy-kalit
DATABASE_URL=sqlite:///./data/company_platform.db
API_V1_PREFIX=/api/v1
CORS_ORIGINS=https://<replit-domeningiz>
FRONTEND_BASE_URL=https://<replit-domeningiz>
```

Telegram yoki Gemini funksiyalari ishlatilsa, ularning kalitlarini ham Secrets bo‘limiga qo‘shing.

## 4. Tekshirish

Replit preview oynasida sayt ochilgach, backend holatini quyidagi manzilda tekshiring:

```text
https://<replit-domeningiz>/api/v1/health
```

Javobda `{"status":"ok"}` chiqsa, backend ishlayapti.

## 5. Muhim eslatma

SQLite ma’lumotlari Replit fayl tizimida saqlanadi. Doimiy va ishlab chiqarish ma’lumotlari uchun Replit PostgreSQL yoki boshqa boshqariladigan PostgreSQL bazasini ulang va `DATABASE_URL` qiymatini shu ulanish satriga almashtiring.