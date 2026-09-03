# Database Schema Documentation

## Overview

The platform uses PostgreSQL with SQLAlchemy ORM. All data is centralized on the server and synchronized across Android and Windows clients through REST APIs.

## Tables and Relationships

### 1. Users Table (`users`)

Stores all user accounts: company owners, managers, and employees.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `user_<timestamp>` |
| `username` | String(100) | Unique, case-insensitive login |
| `email` | String(255) | Unique email address |
| `password_hash` | String(255) | Bcrypt hash (never plaintext) |
| `first_name` | String(100) | User's first name |
| `last_name` | String(100) | User's last name |
| `role` | Enum | `system_admin`, `company_owner`, `manager`, `employee` |
| `is_active` | Boolean | Can be disabled without deletion |
| `is_verified` | Boolean | Email verification flag |
| `created_at` | DateTime | Account creation timestamp |
| `updated_at` | DateTime | Last modification timestamp |

**Relationships:**
- `companies` - one owner → many companies
- `subscriptions` - one user → many subscriptions
- `employees` - one user ↔ one employee profile

---

### 2. Subscription Plans Table (`subscription_plans`)

Defines available tiers and their limits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `plan_<name>` |
| `code` | String(50) | Unique plan code (trial, pro, pro_premium) |
| `name` | String(100) | Display name |
| `description` | Text | Feature description |
| `monthly_price` | Decimal(10,2) | Price in local currency (e.g., Som) |
| `company_limit` | Integer | Max companies per user |
| `employee_limit` | Integer | Max employees per company |
| `features` | Text | JSON or comma-separated features |
| `is_active` | Boolean | Enable/disable plan |
| `created_at` | DateTime | Plan creation date |

**Plans:**
- **trial**: 1 company, 5 employees, 0 cost
- **pro**: 1 company, 50 employees, 200,000 Som/month
- **pro_premium**: 5 companies, 300 employees, 500,000 Som/month

---

### 3. Companies Table (`companies`)

Business entities owned by users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `company_<timestamp>` |
| `owner_id` | String(50) | Foreign key → `users.id` |
| `name` | String(255) | Company legal name |
| `industry` | String(100) | Sector (IT, retail, etc.) |
| `owner_name` | String(100) | Director/contact name |
| `address` | String(255) | Physical address |
| `phone` | String(20) | Contact phone |
| `email` | String(255) | Contact email |
| `working_days` | String(255) | JSON array: `["Mon","Tue",...,"Fri"]` |
| `work_start_time` | String(10) | Format: HH:MM (e.g., "09:00") |
| `work_end_time` | String(10) | Format: HH:MM (e.g., "18:00") |
| `default_break_time` | Integer | Minutes (e.g., 30) |
| `is_active` | Boolean | Soft delete flag |
| `created_at` | DateTime | Company creation date |
| `updated_at` | DateTime | Last update |

**Relationships:**
- `owner` - many companies ← one user
- `subscriptions` - one company ↔ one subscription
- `employees` - one company → many employees
- `work_sessions` - one company → many work sessions

---

### 4. Subscriptions Table (`subscriptions`)

Links users, companies, and plans. Tracks active subscriptions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `sub_<timestamp>` |
| `user_id` | String(50) | Foreign key → `users.id` |
| `company_id` | String(50) | Foreign key → `companies.id` (UNIQUE) |
| `plan_id` | String(50) | Foreign key → `subscription_plans.id` |
| `is_active` | Boolean | Active subscription flag |
| `purchased_at` | DateTime | Purchase timestamp |
| `expires_at` | DateTime | Expiration (NULL = no expiry) |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Constraints:**
- One company can have only one active subscription
- Unused subscriptions set `is_active=False` when upgraded

---

### 5. Employees Table (`employees`)

Employee profiles. Each employee is linked to one user account.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `emp_<timestamp>` |
| `user_id` | String(50) | Foreign key → `users.id` (UNIQUE) |
| `company_id` | String(50) | Foreign key → `companies.id` |
| `first_name` | String(100) | Employee name |
| `last_name` | String(100) | Employee surname |
| `position` | String(100) | Job title (e.g., "Sales Manager") |
| `department` | String(100) | Department (e.g., "Sales") |
| `phone` | String(20) | Work phone |
| `email` | String(255) | Work email |
| `work_schedule` | String(100) | Format: "09:00-18:00" |
| `work_start_time` | String(10) | Daily start HH:MM |
| `work_end_time` | String(10) | Daily end HH:MM |
| `break_start` | String(10) | Break start HH:MM |
| `break_end` | String(10) | Break end HH:MM |
| `status` | String(50) | `active`, `fired`, `on_leave` |
| `is_online` | Boolean | Real-time online status |
| `idle_time` | Integer | Minutes idle |
| `camera_enabled` | Boolean | Camera permission flag |
| `total_work_time` | Integer | Cumulative minutes worked |
| `today_work_time` | Integer | Minutes worked today |
| `current_task` | String(255) | Current assignment |
| `last_activity` | DateTime | Last action timestamp |
| `created_at` | DateTime | Employee record creation |
| `updated_at` | DateTime | Last update |

**Relationships:**
- `user` - many employees ← one user
- `company` - many employees ← one company
- `work_sessions` - one employee → many sessions

---

### 6. Work Sessions Table (`work_sessions`)

Tracks daily work sessions per employee: start, break, end, and computed minutes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(50) | Primary key, format: `session_<timestamp>` |
| `employee_id` | String(50) | Foreign key → `employees.id` |
| `company_id` | String(50) | Foreign key → `companies.id` (denormalized) |
| `status` | String(50) | `not_working`, `working`, `on_break`, `completed` |
| `start_time` | DateTime | Session start |
| `end_time` | DateTime | Session end (NULL if ongoing) |
| `total_work_minutes` | Integer | Computed: (end - start) - break_minutes |
| `break_start_time` | DateTime | Break start |
| `break_end_time` | DateTime | Break end |
| `total_break_minutes` | Integer | Sum of all break intervals |
| `notes` | Text | Session notes or reason for break |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Workflow:**
1. Employee clicks "Start Work" → `status='working'`, `start_time=now`
2. Employee clicks "Take Break" → `status='on_break'`, `break_start_time=now`
3. Employee clicks "Resume" → `status='working'`, `break_end_time=now`, add to `total_break_minutes`
4. Employee clicks "End Work" → `status='completed'`, `end_time=now`, compute `total_work_minutes`

---

## Migrations

Migrations are managed by Alembic in `backend/alembic/versions/`.

### Creating a new migration

```bash
cd backend
python -m alembic revision --autogenerate -m "Description of changes"
```

### Applying migrations

```bash
cd backend
python -m alembic upgrade head
```

### Viewing migration history

```bash
cd backend
python -m alembic history
```

---

## Data Flow Examples

### User Registration Flow

```
POST /api/v1/auth/register
  ↓
Create `users` record (role=company_owner)
  ↓
Auto-assign trial subscription
  ↓
Return JWT tokens
```

### Company Creation Flow

```
POST /api/v1/companies (owner-only)
  ↓
Verify owner's subscription plan company_limit not reached
  ↓
Create `companies` record
  ↓
Create `subscriptions` record linking company to plan
  ↓
Return company ID and details
```

### Employee Creation Flow

```
POST /api/v1/employees (owner/manager)
  ↓
Verify company exists and owner matches
  ↓
Create `users` record (role=employee, temp password)
  ↓
Create `employees` record linking user to company
  ↓
Return employee ID (user can now login)
```

### Work Session Flow

```
POST /api/v1/work-sessions/start
  ↓
Create `work_sessions` record (status=working)
  ↓
Employee records time until end or break
  ↓
POST /api/v1/work-sessions/break
  ↓
Update session (status=on_break, break_start_time=now)
  ↓
POST /api/v1/work-sessions/resume
  ↓
Calculate break minutes, resume (status=working)
  ↓
POST /api/v1/work-sessions/end
  ↓
Mark completed, calculate total_work_minutes
```

---

## Key Design Decisions

1. **Centralized Storage**: All data lives on PostgreSQL, not on clients.
2. **Denormalized Timestamps**: `created_at` and `updated_at` on every table for audit trails.
3. **Soft Deletes**: Use `is_active=False` rather than DELETE for data integrity.
4. **Role-Based Access**: Users have roles; endpoints check role before returning data.
5. **JSON in Strings**: `working_days` stored as JSON string for simplicity (could migrate to JSONB later).
6. **Computed Fields**: `total_work_minutes` and `total_break_minutes` computed server-side, not stored mid-session.
