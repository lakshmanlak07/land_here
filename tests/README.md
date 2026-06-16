# LandHere Backend Tests

## What these tests cover

| File | Endpoints tested |
|---|---|
| `test_health.py` | `GET /` |
| `test_countries.py` | `GET /countries`, `/countries/destinations`, `/countries/origins`, `/countries/{code}` |
| `test_info.py` | `GET /info/phases`, `/info/corridors`, `/info/journey` |
| `test_auth.py` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |

## Database safety

**These tests do not touch your real PostgreSQL database.**

`tests/conftest.py` overrides the `DATABASE_URL` environment variable to `sqlite:///:memory:` before any app module is imported. FastAPI's dependency override system replaces the `get_db` dependency so all requests during testing use an isolated in-memory SQLite database.

The test database is seeded with the same 22 countries and 15 IN→US info steps as production (imported from `app.core.seed`), so read-only tests reflect real data structure.

## Running the tests

### 1 — Install dev dependencies (one-time)

From the `land_here/` root, with your virtual environment active:

```bash
pip install -r requirements-dev.txt
```

### 2 — Run all tests

```bash
pytest tests/ -v
```

### 3 — Run a single test file

```bash
pytest tests/test_countries.py -v
```

### 4 — Run a single test by name

```bash
pytest tests/test_info.py::test_journey_in_us_returns_4_phases -v
```

### 5 — Run only read-only tests (skip auth write tests)

```bash
pytest tests/test_health.py tests/test_countries.py tests/test_info.py -v
```

## Expected output

All tests should pass. A successful run looks like:

```
tests/test_health.py::test_health_check PASSED
tests/test_countries.py::test_list_all_countries_returns_22 PASSED
...
tests/test_auth.py::test_register_returns_201_and_token PASSED
...
N passed in X.XXs
```

## Notes

- Tests are run in-process using FastAPI's `TestClient` (based on httpx). No running server is needed.
- Auth tests use throwaway email addresses with random UUIDs so there are no collisions between test runs.
- The in-memory SQLite database is shared for the session via `StaticPool`. Data from auth tests (registered users) persists within the session but is discarded when pytest exits.
- If you add a new seeded corridor to `app/core/seed.py`, update `test_info.py::test_list_corridors_includes_in_us` to also assert the new corridor is present.
