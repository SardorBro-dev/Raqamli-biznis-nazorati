# Company Operations Platform

A cross-platform business management platform for Android and Windows built around a single shared backend and user account model.

## Architecture overview

```text
Android / Windows clients
        ↓
Shared frontend app
        ↓
FastAPI backend
        ↓
PostgreSQL database
```

The platform uses one central backend and one central PostgreSQL database. Every user account is unique and shared across all devices. Company, employee, chat, schedule, and statistics data are synchronized through the server, not locally on each device.

## Project structure

```text
project-root/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── companies/
│   │   ├── employees/
│   │   ├── schedules/
│   │   ├── attendance/
│   │   ├── chat/
│   │   ├── news/
│   │   ├── announcements/
│   │   ├── notifications/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── reports/
│   │   ├── statistics/
│   │   ├── ai/
│   │   ├── admin/
│   │   ├── support/
│   │   ├── database/
│   │   ├── websocket/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── main.py
│   │   └── routes/
│   ├── alembic/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   └── README.md
├── electron/
├── android/
├── docs/
├── scripts/
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json
├── index.html
├── src/
└── README.md
```

## Tech stack

- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy + Pydantic
- Database: PostgreSQL
- Cross-platform packaging: Capacitor for Android and Electron for Windows
- Auth: JWT access tokens and refresh tokens

## Local setup

### 1. Install frontend dependencies

```bash
npm install
```

Frontend authentication uses the backend by default. Create a root `.env.local` file when the API is running on another host:

```env
VITE_AUTH_MODE=backend
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Use `VITE_AUTH_MODE=local` only for isolated demo work; local mode stores credentials in the browser and is not suitable for production.

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 3. Configure backend environment

```bash
cd backend
copy .env.example .env
```

On Linux/macOS:

```bash
cp .env.example .env
```

### 4. Install backend dependencies

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# Linux/macOS
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Run database migrations

```bash
cd backend
# Apply pending migrations
python -m alembic upgrade head
```

### 6. Run backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Run frontend

```bash
npm run dev
```

### 8. Verify health

```bash
curl http://localhost:8000/api/v1/health
```

## Database schema

The project uses SQLAlchemy ORM with the following main tables:

- `users` - owners, managers, and employees
- `companies` - business entities
- `subscription_plans` - trial, pro, pro_premium tiers
- `subscriptions` - company ↔ plan ↔ user relationships
- `employees` - employee profiles linked to users
- `work_sessions` - daily work session tracking

## Phase status

- Phase 1: project setup, backend initialization, frontend initialization, environment configuration, database config, and basic API are in place.
- Next step: authentication and user role foundation.

## Important constraints

- One backend and one PostgreSQL database for all clients.
- All user accounts are centralized and shared across Android and Windows.
- Camera and employee tracking are not enabled as surveillance features.
- AI and admin features remain server-side and never expose private API keys in the frontend.
