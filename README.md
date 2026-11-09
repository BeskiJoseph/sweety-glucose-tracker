# Sweety — Blood Glucose Tracker

A secure, full-stack blood glucose tracking application built with **React + Vite**, **Node.js + Express**, and **PostgreSQL**.

Designed and engineered for the **Kenpath Junior Full Stack Developer – JavaScript & AI Assignment**, Sweety enables patients to record daily glucose readings across four structured daily slots, view daily/month-to-date/previous-month analytics, monitor monthly trends with interactive charts, and receive background reminder alerts. It also includes a healthcare provider portal where doctors can review reports for their assigned patients.

---

## 1. Project Overview

Managing blood glucose requires consistent tracking, clear validation, and useful summaries. Sweety provides:

- Secure registration and session management using HTTP-only JWT cookies.
- Glucose validation between `40` and `600 mg/dL`, with a maximum of four readings per calendar day and one reading per slot.
- Daily, month-to-date (MTD), and previous-calendar-month reports.
- Redis report caching with targeted invalidation when readings are changed.
- A BullMQ background worker that schedules and records daily meal-logging reminders.
- Role-based access that isolates patient data and allows doctors to view only their assigned patients.
- A Docker Compose setup for the frontend, API, PostgreSQL, Redis, and reminder worker.

---

## 2. Key Features

### 2.1 Core Assignment Features

**Authentication and security**

- User registration and login with bcrypt password hashing (12 salt rounds).
- JWT sessions stored in HTTP-only cookies; tokens are not stored in `localStorage` or `sessionStorage`.
- Rate limiting on authentication endpoints.
- Parameterized SQL queries to protect against SQL injection.
- HTTP security headers configured with Helmet.

**Glucose readings CRUD**

- Create, read, update, and delete glucose readings.
- Supported daily slots:
  - `morning` (fasting)
  - `after_breakfast`
  - `after_lunch`
  - `after_dinner`
- Reading ownership is enforced in database queries so users can access only their own readings.

**Validation messages**

- Missing value: `Please enter a glucose value.`
- Out-of-range or non-integer value: `Value must be between 40 and 600 mg/dl.`
- Duplicate slot: a message such as `You already have an After lunch reading for this date.`
- More than four readings per day: `You can add only 4 readings per day.`
- Future date: `Date cannot be in the future.`

**Statistical reports**

- **Daily:** selected date, highest reading, lowest reading, average to one decimal place, reading count, and individual readings by slot.
- **Month-to-date:** from the first calendar day of the selected month through the selected date.
- **Previous month:** the complete preceding calendar month, including year-boundary and leap-year handling.

### 2.2 Bonus Features Implemented

**Bonus 1 — Backend and frontend pagination**

- `GET /api/readings?page=1&limit=20` uses user-scoped SQL `LIMIT` and `OFFSET`.
- Responsive pagination controls show page numbers and item counts and disable unavailable navigation.

**Bonus 2 — Recharts monthly trend chart**

- Responsive monthly glucose trend chart built with Recharts.
- Interactive tooltips show the date, time slot, and glucose level in mg/dL.

**Bonus 3 — Docker and Docker Compose**

- `docker-compose.yml` orchestrates PostgreSQL, Redis, the Express API, the React frontend served by Nginx, and the BullMQ worker.
- PostgreSQL data is stored in a named volume.
- Services include health checks for PostgreSQL and Redis.

**Bonus 4 — Frontend tests**

- Vitest and React Testing Library tests cover form validation, authentication workflows, route protection, reading lists, reports, and pagination.

**Bonus 5 — Redis report caching**

- Report endpoints use Redis through `ioredis`.
- User-keyed cache tracking sets support targeted invalidation after reading creation, updates, and deletion, without broad `KEYS *` scans.
- When Redis is unavailable, report requests fall back to PostgreSQL.

**Bonus 6 — BullMQ daily reminder worker**

- A separate worker process runs with `npm run worker`.
- The default schedule is `0 20 * * *` and checks for patient users with fewer than four readings logged that day.
- Reminder entries are recorded idempotently in the `reminder_logs` table to avoid duplicate records for the same date.

**Bonus 7 — Healthcare provider (doctor) portal**

- Patient and doctor roles are represented in the database, with a `doctor_patient_assignments` table.
- Doctor endpoints are protected by role and assignment checks.
- The doctor dashboard allows a doctor to select assigned patients and review their reports.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Recharts, CSS Modules, SVG icons |
| Backend | Node.js 20+, Express 5, `pg`, bcrypt, jsonwebtoken, cookie-parser, cors, Helmet |
| Database | PostgreSQL 16, relational tables, foreign keys, unique indexes, check constraints |
| Caching and queues | Redis 7, `ioredis`, BullMQ |
| Testing | Node.js Native Test Runner (`node:test`, `node:assert/strict`), Vitest, React Testing Library, jsdom |
| DevOps and containers | Docker, Docker Compose, Nginx Alpine, multi-stage builds |

---

## 4. Architecture Overview

```text
                         ┌────────────────────────┐
                         │     React Frontend     │
                         │   (Nginx / Vite Dev)   │
                         └───────────┬────────────┘
                                     │ HTTP + JWT cookie
                                     ▼
                         ┌────────────────────────┐
                         │     Express REST API   │
                         │       Port 5000        │
                         └─────┬───────────┬──────┘
                               │           │
                 SQL queries   │           │ Cache lookup / invalidation
                               │           ▼
                               │     ┌─────────────┐
                               │     │ Redis Store │
                               │     └──────▲──────┘
                               ▼            │ BullMQ jobs
                         ┌───────────┐      │
                         │ PostgreSQL│      ▼
                         │ Database  │◄── BullMQ Worker
                         └───────────┘
```

In Docker, Nginx serves the frontend and forwards `/api/` requests to the API service over the Compose network. The API and worker connect to PostgreSQL and Redis using their Docker Compose service names.

---

## 5. Project Folder Structure

```text
sweety-glucose-tracker/
├── .env.example                  # Docker Compose environment template
├── docker-compose.yml            # Multi-container orchestration
├── README.md
├── docs/
│   └── screenshots/
│       ├── 01_login_page.png
│       ├── 02_register_page.png
│       ├── 03_dashboard_tracker.png
│       ├── 04_reports_analytics.png
│       └── 05_doctor_portal.png
├── client/                       # React + Vite frontend
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── components/
│       │   ├── common/
│       │   ├── layout/
│       │   ├── readings/
│       │   └── reports/
│       ├── context/
│       ├── pages/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── doctor/
│       │   └── reports/
│       ├── services/api.js
│       └── __tests__/
└── server/                       # Node.js + Express backend
    ├── .dockerignore
    ├── .env.example              # Local backend environment template
    ├── Dockerfile
    ├── package.json
    ├── database/
    │   ├── migrate.js
    │   ├── migrations/
    │   │   ├── 001_create_users_table.sql
    │   │   ├── 002_create_glucose_readings_table.sql
    │   │   ├── 003_add_user_roles_and_doctor_assignments.sql
    │   │   └── 004_create_reminder_logs_table.sql
    │   └── seeds/seed.js
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/                # Environment, PostgreSQL, Redis
    │   ├── constants/
    │   ├── controllers/
    │   ├── errors/
    │   ├── jobs/
    │   ├── middleware/
    │   ├── repositories/
    │   ├── routes/
    │   ├── services/
    │   ├── utils/
    │   ├── validators/
    │   └── workers/
    └── tests/
        ├── integration/
        └── unit/
```

Local `.env` files are created from the example templates and should not be committed.

---

## 6. Prerequisites

### For local development

- Node.js `20.0.0` or higher.
- PostgreSQL `14` or higher, running locally on port `5432`.
- Redis `7` or higher on port `6379` for caching and the reminder worker. The API can fall back to PostgreSQL for report requests when Redis is unavailable; the worker itself requires Redis.

### For Docker

- Docker Desktop with Docker Compose support (Docker Desktop `24+` recommended).
- No separately installed PostgreSQL or Redis is required when using the Docker Compose setup.

---

## 7. Environment Configuration

Sweety uses **two different environment templates** for two different run modes. Do not mix them.

### 7.1 Local development: `server/.env`

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

The local backend template uses host-based connection addresses because the API runs directly on your computer. Check that the values match your local PostgreSQL and Redis installations:

```ini
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://postgres:root@localhost:5432/sweety_db
DATABASE_SSL=false
JWT_SECRET=replace-with-a-local-development-secret
JWT_EXPIRES_IN=7d
REDIS_URL=redis://127.0.0.1:6379
REPORT_CACHE_TTL_SECONDS=300
REMINDER_SCHEDULE_CRON=0 20 * * *
REMINDER_TIMEZONE=UTC
```

The values above are illustrative local settings. Update the PostgreSQL username/password and database URL to match your own local setup. Use a private development secret; do not reuse it in a deployed environment.

### 7.2 Docker Compose: root `.env`

Create the root environment file from the Docker template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit the root `.env` before starting Docker. The supplied root template defines these variables:

| Variable | Purpose | Default in the example |
|---|---|---:|
| `CLIENT_PORT` | Host port for the Nginx frontend | `3000` |
| `API_PORT` | Host port for direct API access | `5001` |
| `POSTGRES_PORT` | Host port mapped to PostgreSQL | `5434` |
| `REDIS_PORT` | Host port mapped to Redis | `6380` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `root` |
| `POSTGRES_DB` | PostgreSQL database name | `sweety_db` |
| `JWT_SECRET` | JWT signing secret | Example placeholder; replace it |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `REPORT_CACHE_TTL_SECONDS` | Report cache lifetime | `300` |
| `REMINDER_SCHEDULE_CRON` | Reminder schedule | `0 20 * * *` |
| `REMINDER_TIMEZONE` | Timezone used for reminder scheduling | `UTC` |
| `CLIENT_URL` | Optional API client-origin override; defaults to `http://localhost:3000` in Compose | Not set in the root example |

**Important: local and Docker connection addresses are different.**

| Connection | Local development (`server/.env`) | Inside Docker containers |
|---|---|---|
| PostgreSQL | `localhost:5432` | `postgres:5432` |
| Redis | `localhost:6379` | `redis:6379` |
| API | `localhost:5000` | `api:5000` from other containers |
| Frontend | `localhost:5173` | Nginx listens on container port `80` |

Docker Compose constructs the API's `DATABASE_URL` using the `postgres` service name and configures `REDIS_URL` as `redis://redis:6379`. **Do not change these container connection hosts to `localhost`.** Inside a container, `localhost` refers to that same container, not another service.

The root `.env` is read by Docker Compose for variable substitution. The `server/.env` file is for running the backend directly on your machine; Compose supplies the API and worker environment variables in `docker-compose.yml`.

The Compose configuration runs its API and worker containers with `NODE_ENV=development` for the local containerized setup, so the bundled PostgreSQL connection uses the non-TLS local configuration. For a real deployment, use a managed database with TLS enabled and verified, strong secrets, and a production-specific deployment configuration. Never publish `.env` files or real credentials.

---

## 8. Database Setup, Migrations, and Seeding (Local Development)

When running the API outside Docker, make sure PostgreSQL is running and create the database if it does not already exist:

```sql
CREATE DATABASE sweety_db;
```

Run migrations:

```bash
npm --prefix server run migrate
```

Seed the demo patient, doctor, sample readings, and doctor-patient assignment:

```bash
npm --prefix server run seed
```

The migration runner tracks applied migrations in the `_migrations` table. The seed script is designed to be idempotent.

**Docker note:** the API container's startup command runs migrations and the seed script before starting the API. You do not need to run those two commands manually for a fresh Docker Compose startup.

---

## 9. Running Locally

First install dependencies:

```bash
npm ci --prefix server
npm ci --prefix client
```

Make sure your local PostgreSQL and Redis services are running, create `sweety_db`, and complete the migration and seed steps in [Section 8](#8-database-setup-migrations-and-seeding-local-development).

Start the Express backend:

```bash
# Terminal 1
cd server
npm start
# API listens at http://localhost:5000
```

Start the reminder worker (optional; Redis must be running):

```bash
# Terminal 2
cd server
npm run worker
```

Start the Vite frontend:

```bash
# Terminal 3
cd client
npm run dev
# Frontend: http://localhost:5173
```

The Vite development server proxies `/api` requests to `http://localhost:5000`.

---

## 10. Running with Docker Compose

Docker Compose starts five services: PostgreSQL, Redis, the Express API, the Nginx frontend, and the BullMQ worker.

### 10.1 Configure and start

From the repository root, create and edit `.env` as described in [Section 7.2](#72-docker-compose-root-env). Then validate the Compose configuration and build/start the services:

```bash
# Validate the resolved Compose configuration
docker compose config

# Build images and start all services in the background
docker compose up -d --build

# Check service status
docker compose ps
```

The API container runs database migrations and seeds demo data before starting the Express server. PostgreSQL and Redis health checks are used as startup dependencies for the API and worker.

### 10.2 Access the application

| Service | Container port | Host port (default) | Address / purpose |
|---|---:|---:|---|
| Frontend / Nginx | `80` | `3000` | [http://localhost:3000](http://localhost:3000) |
| Express API | `5000` | `5001` | [http://localhost:5001/api](http://localhost:5001/api) |
| PostgreSQL | `5432` | `5434` | Host database tools can connect to `localhost:5434` |
| Redis | `6379` | `6380` | Host Redis tools can connect to `localhost:6380` |
| BullMQ worker | — | — | Background process; no published port |

For normal browser use, open the frontend at `http://localhost:3000`. Nginx forwards `/api/` requests internally to `http://api:5000`; the browser does not need to connect to the Docker service name.

### 10.3 Verify the services

Check the API directly:

```bash
curl http://localhost:5001/api/health
```

Check the API through the Nginx reverse proxy:

```bash
curl http://localhost:3000/api/health
```

Both requests should return the API health response. The frontend should load at `http://localhost:3000`.

### 10.4 View logs

```bash
# Follow API logs
docker compose logs -f api

# Follow frontend / Nginx logs
docker compose logs -f client

# Follow the background worker logs
docker compose logs -f worker

# View database and Redis logs
 docker compose logs --tail=100 postgres redis
```

### 10.5 Stop or reset the stack

Stop containers and networks while preserving the PostgreSQL volume:

```bash
docker compose down
```

Stop containers and **delete the PostgreSQL data volume**:

```bash
docker compose down -v
```

`docker compose down -v` permanently deletes the database volume and all data stored in it. Use it only when you intentionally want to reset the local Docker database.

### 10.6 Docker troubleshooting

**Frontend displays `502 Bad Gateway`**

1. Check whether the API container is running: `docker compose ps`.
2. Inspect API startup errors: `docker compose logs --tail=100 api`.
3. Inspect Nginx logs: `docker compose logs --tail=100 client`.
4. Test the direct API endpoint at `http://localhost:5001/api/health`.
5. Test the same endpoint through Nginx at `http://localhost:3000/api/health`.

If the direct API health check fails, investigate the API startup logs and its PostgreSQL/Redis dependencies. If the direct API works but the Nginx-proxied endpoint fails, check the Nginx upstream configuration. The configured upstream is `http://api:5000`; `api` is the Compose service name. Do not replace it with `localhost:5001` inside the Nginx container.

**API cannot connect to PostgreSQL**

- Confirm `postgres` is healthy with `docker compose ps`.
- The API container must use the Compose network address `postgres:5432`, not `localhost:5434`.
- Check `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in the root `.env` file.

**API or worker cannot connect to Redis**

- Confirm Redis is healthy with `docker compose ps`.
- Containers use `redis://redis:6379`. `localhost:6380` is only the host-side mapped address.

**A host port is already in use**

Change the corresponding host port in the root `.env` file (`CLIENT_PORT`, `API_PORT`, `POSTGRES_PORT`, or `REDIS_PORT`) and recreate the stack with `docker compose up -d --build`. The internal container ports and service names remain unchanged.

---

## 11. Automated Testing and Build Checks

Run the backend test suite (Node.js Native Test Runner):

```bash
npm --prefix server test
```

The recorded verification run reported **79 passing backend tests across 14 suites**. Backend integration tests use PostgreSQL and Redis, so make sure the test environment has the required services and configuration.

Run the frontend test suite (Vitest and React Testing Library):

```bash
npm --prefix client test
```

The recorded verification run reported **17 passing frontend tests across 5 test files**.

Run frontend lint and production build checks:

```bash
# ESLint
npm --prefix client run lint

# Vite production build
npm --prefix client run build
```

The recorded final audit reported zero lint warnings/errors and a successful frontend production build. These are the results of the recorded audit, not a claim that the commands have been rerun after every later change.

---

## 12. API Documentation

Protected endpoints require an authenticated session established through the `token` HTTP-only cookie.

### Authentication — `/api/auth`

| Method | Endpoint | Description | Status codes |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a user (defaults to the patient role) | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | Authenticate and set the HTTP-only cookie | `200`, `400`, `401`, `429` |
| `GET` | `/api/auth/me` | Restore the user profile from the active cookie session | `200`, `401` |
| `POST` | `/api/auth/logout` | Clear the session cookie | `200` |

### Glucose readings — `/api/readings`

| Method | Endpoint | Description | Status codes |
|---|---|---|---|
| `POST` | `/api/readings` | Create a glucose reading with validation | `201`, `400`, `409` |
| `GET` | `/api/readings?page=1&limit=20` | Get the authenticated user's paginated readings | `200`, `400`, `401` |
| `GET` | `/api/readings/:id` | Retrieve a single reading with ownership checks | `200`, `401`, `404` |
| `PUT` | `/api/readings/:id` | Update a reading with ownership checks | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/readings/:id` | Delete a reading with ownership checks | `200`, `401`, `404` |

### Reports and analytics — `/api/reports`

| Method | Endpoint | Description | Status codes |
|---|---|---|---|
| `GET` | `/api/reports?date=YYYY-MM-DD` | Daily, MTD, and previous-month statistics (Redis-cached) | `200`, `400`, `401` |
| `GET` | `/api/reports/trend?month=YYYY-MM` | Chronological monthly readings for the trend chart | `200`, `400`, `401` |

### Doctor portal — `/api/doctor`

| Method | Endpoint | Description | Status codes |
|---|---|---|---|
| `GET` | `/api/doctor/patients` | List patients assigned to the authenticated doctor | `200`, `403` |
| `GET` | `/api/doctor/patients/:patientId/reports?date=YYYY-MM-DD` | View reports for an assigned patient | `200`, `403` |

---

## 13. Demo Credentials

The seed script prepares the following demo accounts:

| Role | Email | Password | Access |
|---|---|---|---|
| Patient | `patient@sweety.local` | `Patient123!` | Sarah Jenkins; seeded readings spanning six months |
| Doctor | `doctor@sweety.local` | `Doctor123!` | Dr. Gregory House; assigned to monitor Sarah Jenkins |

These credentials are for local demonstration only. Do not use them for a public deployment.

---

## 14. Application Screenshots

The following screenshots were captured from the running application:

### 14.1 Login and security portal

![Login Page](docs/screenshots/01_login_page.png)

### 14.2 User registration

![Register Page](docs/screenshots/02_register_page.png)

### 14.3 Patient dashboard — today's readings and history

![Patient Dashboard](docs/screenshots/03_dashboard_tracker.png)

### 14.4 Statistical reports and monthly trend chart

![Reports and Trend Chart](docs/screenshots/04_reports_analytics.png)

### 14.5 Healthcare professional portal

![Doctor Portal](docs/screenshots/05_doctor_portal.png)

---

## 15. Known Limitations and Future Improvements

### Known limitations

- **Email/SMS delivery:** The BullMQ reminder worker records reminders in the `reminder_logs` database table and writes structured console logs. It does not send live emails or SMS because an external SMTP/Twilio provider was not configured for this assignment.
- **Walkthrough video:** Screenshots were captured from the running application. A short browser walkthrough video should be recorded separately if required for submission.

### Potential future improvements

1. Add Web Push notifications when readings are missed.
2. Track insulin doses and carbohydrate intake alongside glucose readings.
3. Add CGM data import, for example CSV or supported Dexcom Clarity exports.
4. Generate downloadable PDF summaries for doctor consultations.

---

## 16. Notes — Assumptions and Next Improvements

**Assumptions**

- Glucose values are entered in **mg/dL**.
- A patient can record one reading for each of the four supported slots per calendar day, with a maximum of four readings per day.
- Doctors can access reports only for patients explicitly assigned to them.
- The reminder worker currently records reminder events; it does not deliver external notifications.
- This project is an assignment/demo application, not a validated medical device or a replacement for professional medical advice. Do not store real patient information in a public deployment without an appropriate security, privacy, and regulatory review.

**What I would improve with more time**

- Integrate a real email or push-notification provider and let users configure their reminder preferences and timezone.
- Add end-to-end, load, and deployment-level tests, plus production monitoring and structured alerting.
- Add clinical PDF exports and supported CGM data imports.
- Prepare a production deployment configuration with HTTPS, managed PostgreSQL/Redis, secret management, backups, and operational monitoring.
