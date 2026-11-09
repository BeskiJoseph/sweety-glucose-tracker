# Sweety — Blood Glucose Tracker

A secure, full-stack metabolic wellness and blood glucose tracking web application built with **React + Vite**, **Node.js + Express**, and **PostgreSQL**.

Designed and engineered for the **Kenpath Junior Full Stack Developer – JavaScript & AI Assignment**. Sweety enables patients to record daily glucose readings across four structured daily slots, view detailed daily/MTD/monthly analytics, monitor monthly glycemic trends with interactive charts, and receive background reminder alerts. It also offers a dedicated healthcare provider portal for doctors to review assigned patient metrics.

---

## 1. Project Overview

Managing diabetes and metabolic health requires consistent tracking, strict data validation, and meaningful clinical insights. Sweety provides:
- Seamless and secure user registration and session management via HTTP-only JWT cookies.
- Strict clinical validation rules enforcing blood glucose boundaries (`40` to `600 mg/dL`) and calendar day constraints (maximum 4 readings per day, exactly one per slot).
- Comprehensive statistical reporting covering daily, month-to-date (MTD), and previous-month metrics.
- High-performance caching using **Redis** with automated cache invalidation upon any reading mutation.
- Asynchronous background worker powered by **BullMQ** to process and log scheduled daily meal-logging reminders.
- Role-based authorization isolating patient data while granting verified doctors access only to their assigned patients.
- Fully containerized multi-container orchestration via **Docker Compose** featuring persistent volumes and health checks.

---

## 2. Key Features

### 2.1 Core Assignment Features
- **Authentication & Security:**
  - Secure user registration and login with bcrypt password hashing (12 salt rounds).
  - Cryptographically signed JWT tokens stored strictly in HTTP-only, secure, `SameSite=lax/strict` cookies (zero token storage in `localStorage` or `sessionStorage`).
  - Brute-force rate limiting on authentication endpoints with automated memory cleanup.
  - SQL injection protection via parameterized queries and OWASP-recommended HTTP security headers via Helmet.
- **Glucose Readings CRUD:**
  - Full Create, Read, Update, and Delete operations for glucose records.
  - Allowed time slots: `morning` (fasting), `after_breakfast`, `after_lunch`, `after_dinner`.
  - Strict user ownership validation in SQL queries ensuring complete data isolation.
- **Exact Validation Messages:**
  - Missing value: `"Please enter a glucose value."`
  - Out of bounds or non-integer: `"Value must be between 40 and 600 mg/dl."`
  - Duplicate slot: Dynamic message matching grammar, e.g. `"You already have an After lunch reading for this date."` or `"You already have a Morning reading for this date."`
  - Exceeding daily limit: `"You can add only 4 readings per day."`
  - Future date: `"Date cannot be in the future."`
- **Statistical Reports:**
  - Daily report: Selected date, highest reading, lowest reading, average rounded to one decimal place, count, and individual readings by slot.
  - Month-to-date (MTD) report: First calendar day of the selected month through the selected date.
  - Previous-month report: Full preceding calendar month with accurate December-to-January and leap-year boundaries.

### 2.2 Bonus Features Implemented
- **Bonus 1 — Backend & Frontend Pagination:**
  - `GET /api/readings?page=1&limit=20` with user-isolated SQL `LIMIT` and `OFFSET`.
  - Responsive pagination controls displaying page numbers, item counts, and disabled boundary buttons.
- **Bonus 2 — Recharts Monthly Trend Line Chart:**
  - Dynamic, responsive monthly glucose trend visualization powered by Recharts.
  - Interactive tooltips displaying exact timestamp, date, slot label, and glucose level in mg/dL.
- **Bonus 3 — Docker & Docker Compose Orchestration:**
  - Production-ready `docker-compose.yml` orchestrating PostgreSQL, Redis, Express API, React frontend (Nginx reverse proxy), and BullMQ worker.
  - Named persistent volume for PostgreSQL and built-in service health checks.
- **Bonus 4 — Frontend Test Suite:**
  - 17 comprehensive unit and integration tests using Vitest and React Testing Library testing form validations, auth workflows, route protection, reading lists, reports, and pagination.
- **Bonus 5 — Redis Report Caching:**
  - High-performance caching for report endpoints using `ioredis`.
  - User-keyed cache tracking sets enabling instant targeted invalidation upon reading creation, update, or deletion without expensive `KEYS *` scans.
  - Graceful fallback: If Redis is offline, the API falls back to direct PostgreSQL queries without interruption.
- **Bonus 6 — BullMQ Daily Reminder Worker:**
  - Standalone worker process (`npm run worker`) connected to Redis and BullMQ.
  - Configurable cron schedule (`0 20 * * *`) identifying patient users with fewer than 4 readings logged today.
  - Idempotent reminder logging in `reminder_logs` database table preventing duplicate notifications on the same date.
- **Bonus 7 — Healthcare Provider (Doctor) Portal:**
  - Multi-role schema (`patient` and `doctor`) with `doctor_patient_assignments` table.
  - Strict authorization middleware restricting `/api/doctor/*` endpoints to doctor accounts.
  - Doctor dashboard enabling physicians to select assigned patients and inspect their glycemic reports.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Recharts, CSS Modules, Lucide-style SVG icons |
| **Backend** | Node.js (v20+), Express 5, `pg` (node-postgres), bcrypt, jsonwebtoken, cookie-parser, cors, helmet |
| **Database** | PostgreSQL 16 (Relational tables, foreign keys, unique composite indexes, check constraints) |
| **Caching & Queues**| Redis 7, `ioredis`, `bullmq` |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert/strict`), Vitest, React Testing Library, jsdom |
| **DevOps / Containers**| Docker, Docker Compose, Nginx Alpine, Multi-stage builds |

---

## 4. Architecture Overview

```
                          ┌────────────────────────┐
                          │     React Frontend     │
                          │   (Nginx / Vite Dev)   │
                          └───────────┬────────────┘
                                      │ HTTP + Credentials (JWT Cookie)
                                      ▼
                          ┌────────────────────────┐
                          │    Express REST API    │
                          │   (Port 5000 / 5001)   │
                          └─────┬───────────┬──────┘
                                │           │
              SQL (node-postgres)           │ Cache Lookup / Invalidation
                                │           ▼
                                │    ┌─────────────┐
                                │    │ Redis Store │
                                │    └──────▲──────┘
                                ▼           │ Job Queue
                          ┌───────────┐     │
                          │PostgreSQL │     ▼
                          │ Database  │◄────┴──────┐
                          └───────────┘     │ BullMQ Worker │
                                            │ Process       │
                                            └───────────────┘
```

---

## 5. Project Folder Structure

```
sweety-glucose-tracker/
├── .env.example                       # Root environment example for Docker Compose
├── docker-compose.yml                 # Multi-container orchestration specification
├── README.md                          # Comprehensive project documentation
├── docs/
│   └── screenshots/                   # Real application screenshots
│       ├── 01_login_page.png
│       ├── 02_register_page.png
│       ├── 03_dashboard_tracker.png
│       ├── 04_reports_analytics.png
│       └── 05_doctor_portal.png
├── client/                            # React + Vite frontend application
│   ├── .dockerignore
│   ├── Dockerfile                     # Multi-stage production Nginx container
│   ├── nginx.conf                     # Nginx configuration with /api reverse proxy
│   ├── package.json
│   ├── vite.config.js                 # Vite configuration with local API proxy
│   └── src/
│       ├── components/
│       │   ├── common/                # Reusable UI library (Button, Card, Input, Alert, etc.)
│       │   ├── layout/                # Navigation bar and header
│       │   ├── readings/              # ReadingForm, ReadingItem, Pagination
│       │   └── reports/               # ReportSummaryCard, TrendChart (Recharts)
│       ├── context/                   # AuthContext and useAuth session provider
│       ├── pages/
│       │   ├── auth/                  # LoginPage, RegisterPage
│       │   ├── dashboard/             # Patient Dashboard (Log reading & history)
│       │   ├── doctor/                # Doctor Portal (Assigned patient reports)
│       │   └── reports/               # Statistical Reports & Analytics
│       ├── services/api.js            # Centralized fetch API client with credentials
│       └── __tests__/                 # Vitest + RTL component & integration test suite
└── server/                            # Node.js + Express backend application
    ├── .dockerignore
    ├── Dockerfile                     # Alpine Node.js production image
    ├── package.json
    ├── .env                           # Server environment variables
    ├── .env.example                   # Server environment template
    ├── database/
    │   ├── migrate.js                 # Transactional migration runner
    │   ├── migrations/                # Numbered SQL migration files
    │   │   ├── 001_create_users_table.sql
    │   │   ├── 002_create_glucose_readings_table.sql
    │   │   ├── 003_add_user_roles_and_doctor_assignments.sql
    │   │   └── 004_create_reminder_logs_table.sql
    │   └── seeds/
    │       └── seed.js                # Idempotent demo patient, doctor, and readings seed
    ├── src/
    │   ├── app.js                     # Express app setup, security middleware & routes
    │   ├── server.js                  # HTTP server listener and graceful shutdown
    │   ├── config/                    # Environment, PostgreSQL pool, Redis client
    │   ├── constants/                 # Auth, reading, and time slot constants
    │   ├── controllers/               # Auth, reading, and doctor route controllers
    │   ├── errors/AppError.js         # Standardized application operational errors
    │   ├── jobs/                      # BullMQ queue definition and job scheduler
    │   ├── middleware/                # Auth, doctor role, rate limiting, error handler
    │   ├── repositories/              # Parameterized SQL database access layer
    │   ├── routes/                    # API route definitions
    │   ├── services/                  # Business logic (CRUD, aggregations, caching)
    │   ├── utils/                     # Password hashing and JWT token utilities
    │   ├── validators/                # Strict schema validation and error messages
    │   └── workers/                   # Background reminder worker process
    └── tests/                         # Node.js native test runner integration suite
        ├── integration/
        │   ├── auth.api.test.js
        │   ├── glucose_readings.schema.test.js
        │   ├── platform.bonus.test.js
        │   └── readings.api.test.js
        └── unit/
            └── auth.test.js
```

---

## 6. Prerequisites

To run Sweety locally, ensure you have:
- **Node.js**: `v20.0.0` or higher (Node 20+ required for native test runner and crypto support)
- **PostgreSQL**: `v14` or higher (running locally on port 5432)
- **Redis** *(optional for local development, fallback included)*: `v7+` (running on port 6379)
- **Docker & Docker Compose** *(for containerized deployment)*: Docker Desktop `v24+`

---

## 7. Environment Variables

Create `server/.env` based on `server/.env.example`:

```ini
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://postgres:root@localhost:5432/sweety_db
DATABASE_SSL=false
JWT_SECRET=sweety_super_secret_jwt_key_dev_mode_12345
JWT_EXPIRES_IN=7d
REDIS_URL=redis://127.0.0.1:6379
REPORT_CACHE_TTL_SECONDS=300
REMINDER_SCHEDULE_CRON=0 20 * * *
REMINDER_TIMEZONE=UTC
```

---

## 8. Database Setup, Migrations & Seeding

### 8.1 Initialize Database
Ensure PostgreSQL is running and create the `sweety_db` database:
```sql
CREATE DATABASE sweety_db;
```

### 8.2 Run Migrations
Sweety uses a lightweight SQL migration runner that tracks executed files in the `_migrations` table:
```bash
npm --prefix server run migrate
```

### 8.3 Run Idempotent Seed
Populate demo patient and doctor accounts, clinical readings across 6 months, and doctor-patient assignments:
```bash
npm --prefix server run seed
```

---

## 9. Running Locally

### 9.1 Start Express Backend
```bash
# Terminal 1
cd server
npm start
# Server listens on http://localhost:5000
```

### 9.2 Start Background Reminder Worker (Optional)
```bash
# Terminal 2
cd server
npm run worker
# BullMQ worker listens for scheduled daily reminder jobs
```

### 9.3 Start React Vite Frontend
```bash
# Terminal 3
cd client
npm run dev
# Frontend accessible at http://localhost:5173
```

---

## 10. Running with Docker Compose (Bonus 3)

The application includes a fully automated Docker Compose setup with zero external dependencies required:

```bash
# 1. Build and start all 5 services in detached mode
docker compose up -d --build

# 2. View running service status
docker compose ps

# 3. View logs for any service
docker compose logs -f api
docker compose logs -f worker

# 4. Stop containers preserving database data
docker compose down

# 5. Stop containers AND delete database volume (WARNING: Deletes all stored readings)
docker compose down -v
```

### Docker Port Mappings:
| Service | Internal Port | Host Port | URL / Notes |
|---|---|---|---|
| **client** | 80 | **3000** | `http://localhost:3000` (React SPA + Nginx reverse proxy) |
| **api** | 5000 | **5001** | `http://localhost:5001/api` (Direct Express API) |
| **postgres** | 5432 | **5434** | Local PostgreSQL instance (mapped to avoid 5432 conflicts) |
| **redis** | 6379 | **6380** | Redis Cache & BullMQ message broker |
| **worker** | — | — | Standalone BullMQ reminder process |

---

## 11. Automated Testing

### 11.1 Backend Test Suite (Node.js Native Test Runner)
Executes all unit tests and integration tests with real PostgreSQL and Redis connections:
```bash
npm --prefix server test
```
*Result: 79/79 passing tests across 14 suites.*

### 11.2 Frontend Test Suite (Vitest + React Testing Library)
Executes component and integration tests with jsdom:
```bash
npm --prefix client test
```
*Result: 17/17 passing tests across 5 test files.*

### 11.3 Code Quality & Production Build Verification
```bash
# Verify ESLint (0 errors, 0 warnings)
npm --prefix client run lint

# Verify Vite production bundle
npm --prefix client run build
```

---

## 12. API Documentation

All protected endpoints require an authenticated session established via the `token` HTTP-only cookie.

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user (defaults to patient role) | 201, 400, 409 |
| `POST` | `/api/auth/login` | Authenticate with email/password; sets HTTP-only cookie | 200, 400, 401, 429 |
| `GET` | `/api/auth/me` | Restore user profile from active cookie session | 200, 401 |
| `POST` | `/api/auth/logout` | Clear session cookie | 200 |

### Glucose Readings Endpoints (`/api/readings`)
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/readings` | Create glucose reading with validation | 201, 400, 409 |
| `GET` | `/api/readings?page=1&limit=20` | Paginated list of user readings | 200, 400, 401 |
| `GET` | `/api/readings/:id` | Retrieve single reading by ID | 200, 401, 404 |
| `PUT` | `/api/readings/:id` | Update reading value or slot | 200, 400, 404, 409 |
| `DELETE` | `/api/readings/:id` | Delete reading with ownership check | 200, 401, 404 |

### Report & Analytics Endpoints (`/api/reports`)
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/reports?date=YYYY-MM-DD` | Daily, MTD, and previous-month statistical report (Redis-cached) | 200, 400, 401 |
| `GET` | `/api/reports/trend?month=YYYY-MM` | Chronological monthly readings for Recharts trend line | 200, 400, 401 |

### Doctor Portal Endpoints (`/api/doctor`)
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/doctor/patients` | Retrieve list of patients assigned to authenticated doctor | 200, 403 |
| `GET` | `/api/doctor/patients/:patientId/reports?date=YYYY-MM-DD` | View assigned patient's clinical reports | 200, 403 |

---

## 13. Demo Credentials

The database seed script automatically prepares two realistic user accounts:

| Role | Email | Password | Access Description |
|---|---|---|---|
| **Patient** | `patient@sweety.local` | `Patient123!` | Sarah Jenkins (180+ seeded readings spanning 6 months, daily stats, trend charts) |
| **Doctor** | `doctor@sweety.local` | `Doctor123!` | Dr. Gregory House (Assigned to monitor Sarah Jenkins) |

---

## 14. Application Screenshots

Real application screenshots captured directly from the live running application:

### 14.1 Login & Security Portal
![Login Page](docs/screenshots/01_login_page.png)

### 14.2 User Registration
![Register Page](docs/screenshots/02_register_page.png)

### 14.3 Patient Dashboard — Today's Readings & Reverse Chronological History
![Patient Dashboard](docs/screenshots/03_dashboard_tracker.png)

### 14.4 Statistical Reports & Recharts Monthly Trend Chart
![Reports & Trend Chart](docs/screenshots/04_reports_analytics.png)

### 14.5 Healthcare Professional Portal (Doctor View)
![Doctor Portal](docs/screenshots/05_doctor_portal.png)

---

## 15. Known Limitations & Future Improvements

### Known Limitations
- **Email Delivery Provider**: The BullMQ daily reminder worker records reminders in the `reminder_logs` database table and outputs structured console logs. It does not dispatch live emails or SMS messages because a third-party SMTP/Twilio account was not provisioned for this assignment.
- **Manual Video Recording**: Automated screenshot capture was completed using headless Chrome CDP. A short walkthrough video recording of the browser UI should be captured manually if required for final submission review.

### Future Improvements
1. **Push Notifications**: Integrate Web Push API for browser notifications when readings are missed.
2. **Insulin & Carbohydrate Correlation**: Extend the reading schema to track bolus insulin units and carbohydrate grams per meal.
3. **Continuous Glucose Monitor (CGM) Integration**: Add CSV / Dexcom Clarity file import for automated reading ingestion.
4. **PDF Clinical Summary Export**: Generate downloadable clinical PDF reports for doctor consultations.
