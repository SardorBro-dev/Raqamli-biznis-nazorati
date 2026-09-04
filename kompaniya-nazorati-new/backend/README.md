# Backend

This backend is built with FastAPI and PostgreSQL for the cross-platform company management platform.

## Quick start

1. Create a virtual environment
2. Install dependencies
3. Configure environment variables
4. Start the API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API routes

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

## Notes

- This is the initial MVP backend skeleton.
- PostgreSQL is configured but the full schema is to be implemented in the next phases.
