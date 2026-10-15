# LandHere

A free mobile companion for international students, from university acceptance to
settling in abroad. It walks a student through the visa process, departure and
first weeks for **India → United States, United Kingdom and Canada**, in plain
English, with every step linked to its official government source.

LandHere gives **no legal or immigration advice**. Each journey step carries an
`is_verified` flag and a cited source. Unverified steps are labelled in the app.
Verification records: `VERIFY_visa_india_us.md`, `VERIFY_visa_IN_UK.md`, `VERIFY_visa_IN_CA.md`.

> Legal documents in `LAUNCH/` are **drafts awaiting review by a qualified lawyer**.

## What the app does
- **Account:** email/password with refresh-token rotation, password reset by email
  (Resend), profile editing, in-app account deletion.
- **Onboarding:** destination, origin, university, stage and goals.
- **Visa journeys:** IN→US, IN→UK and IN→CA. Progress is offline-first and per-account,
  and syncs across devices.
- **LandHere Score rankings:** 267 scored U.S. universities (500 ingested). See the
  in-app methodology screen and `data/README.md`.
- **Money and preparation:** currency converter (ECB rates via Frankfurter),
  scholarships, work-hour rules, necessities checklists.
- **Offline:** saved journeys and rankings stay readable without a connection.
- **Price:** the app is **free**. Paid-tier code is parked behind `PAYWALL_ENABLED` and
  `PURCHASES_ENABLED`, both off, and no store SDK ships.

## Stack
| Layer | Technology |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81, TypeScript, Expo Router 6, Zustand, TanStack Query (persisted) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PyJWT (HS256), passlib/bcrypt |
| Database | PostgreSQL 16+ (tests: SQLite in-memory plus a PostgreSQL integration suite) |
| Email | Resend HTTP API (SMTP fallback) |
| Hosting target | Render (`render.yaml`), Docker |

## Local setup
Backend (repo root, Python 3.12):
```bash
python -m venv .venv && .venv/Scripts/activate    # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                              # then set DATABASE_URL and SECRET_KEY
alembic upgrade head
python -m app.core.seed                           # countries + 3 journey corridors (idempotent)
python -m app.core.universities_dataset load      # 500 universities (idempotent)
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mobile (`mobile/`, Node 22):
```bash
npm ci
cp .env.example .env    # EXPO_PUBLIC_API_URL=http://localhost:8000 (USB + adb reverse) or your LAN IP
npx expo start --dev-client
```
Install the EAS development build on the phone first; store Expo Go runs only the newest SDK.

## Checks
| What | Command |
|---|---|
| Backend tests (SQLite, plus PostgreSQL when `.env` points at one) | `pytest -q` |
| Migrations, seed and dataset on a disposable DB | `python scripts/check_migrations.py` |
| Live API smoke test against a running server | `python scripts/smoke_api.py http://127.0.0.1:8000` |
| Load test (local, disposable DB only) | `python scripts/load_test.py --users 150` (see `docs/CAPACITY.md`) |
| Mobile type check, lint, policy and session checks, unit tests | `npx tsc --noEmit && npx eslint . && npm run check && npm test` |
| Release bundle scan | `npx expo export --platform android --clear --output-dir dist-a && ./scripts/scan-bundle.sh dist-a https://<api-host>` |

CI runs the backend and mobile checks: `.github/workflows/ci.yml`.

## Documentation
- `docs/BUILD_PROGRESS.md`: what was built and the current state (resume file).
- `docs/RELEASE_READINESS.md`: verified evidence and external dependencies.
- `docs/RUNBOOK.md`: deploy, migrate, backup, restore, rollback.
- `docs/CAPACITY.md`: load-test results and the scaling model.
- `BUILD_STATUS.md`: launch-sprint status record.
- `LAUNCH/`: store checklists and the legal drafts.
