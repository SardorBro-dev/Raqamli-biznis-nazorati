# Project Architecture

## High-level architecture

```text
Android / Windows client
        ↓
Shared frontend app
        ↓
FastAPI backend
        ↓
PostgreSQL database
```

## Responsibilities

- Android and Windows share the same account, company, employee, chat, and statistics data via centralized backend services.
- Backend exposes REST APIs and WebSocket endpoints.
- Database stores the canonical state.
- Frontend is optimized for both mobile touch and desktop experiences.

## Domain areas

- Auth and user management
- Company and subscription management
- Employee lifecycle and work sessions
- Chat, notifications, and announcements
- Reports, AI analytics, and admin operations

## Phase plan

1. Project setup and environment
2. Authentication and roles
3. Company and subscription
4. Employee and work sessions
5. Chat, news, notifications
6. Reports, AI, admin panel
7. Cross-platform packaging
8. Testing and production hardening
