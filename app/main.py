import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routes import account, auth, countries, images, info, guides, progress, purchases, universities

logger = logging.getLogger("landhere")
if not logging.getLogger().handlers:
    logging.basicConfig(level=settings.LOG_LEVEL.upper(), format="%(levelname)s %(name)s %(message)s")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(application: FastAPI):
    # Bound concurrent sync handlers to what the DB pool can serve.
    import anyio.to_thread

    anyio.to_thread.current_default_thread_limiter().total_tokens = settings.THREADPOOL_SIZE
    # ── Startup checks ───────────────────────────────────────────────────────
    if "*" in settings.cors_allow_origins:
        logger.warning(
            "CORS_ALLOW_ORIGINS is wildcard ('*'). "
            "Set it to your explicit production origin(s) before going live. "
            "See PRE_LAUNCH_SECURITY.md §2."
        )
    # ─────────────────────────────────────────────────────────────────────────
    yield


app = FastAPI(
    title="LandHere API",
    description="Information-first companion for international students",
    version="1.0.0",
    lifespan=lifespan,
    # The interactive docs enumerate every route, parameter, and schema. Useful
    # in development, an unnecessary map of the attack surface in production —
    # the mobile client never reads them. None disables the route entirely.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)


from sqlalchemy.exc import OperationalError  # noqa: E402
from sqlalchemy.exc import TimeoutError as PoolTimeoutError  # noqa: E402


@app.exception_handler(PoolTimeoutError)
@app.exception_handler(OperationalError)
async def pool_timeout_handler(request: Request, exc: Exception):
    """Database pool exhausted, or the connection dropped/refused (restart,
    failover, deadlock): transient, not a bug. Tell the client to retry shortly
    instead of returning an opaque 500. The driver message is not echoed."""
    path = getattr(request.scope.get("route"), "path", "<unmatched>")
    logger.warning("Database unavailable (%s) on %s %s", type(exc).__name__, request.method, path)
    return JSONResponse(
        status_code=503,
        content={"detail": "The service is busy. Please try again in a moment."},
        headers={"Retry-After": "2"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the real error server-side; return a generic message to the client.

    Prevents stack traces / internal details from leaking in responses.
    FastAPI's own HTTPException / validation errors are handled separately
    and keep their intended status codes and messages.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# The API authenticates with Bearer tokens in the Authorization header (see
# app/core/deps.py), NOT cookies — so it does not need credentialed CORS.
# Allowed origins come from the CORS_ALLOW_ORIGINS env var (comma-separated); the
# default "*" keeps local Expo/LAN dev working, and production should set it to the
# explicit web/prod domain(s) — see PRE_LAUNCH_SECURITY.md (#2).
# With allow_credentials=False a wildcard origin is safe: browsers will share
# responses but cannot attach a victim's cookies/credentials to the request, and the
# native mobile client isn't subject to CORS at all.
_cors_origins = settings.cors_allow_origins
# Credentialed CORS is intentionally OFF. The "*" + credentials combination is
# rejected by browsers and unsafe, so we assert it can never be introduced by accident
# if credentials are ever enabled here in future.
_allow_credentials = False
assert not (_allow_credentials and "*" in _cors_origins), (
    "Refusing to combine wildcard CORS origins with allow_credentials=True; "
    "set CORS_ALLOW_ORIGINS to explicit origins before enabling credentials."
)
# Compress responses larger than minimum_size bytes (gzip). Added BEFORE the
# CORS middleware below so CORS remains the OUTERMOST middleware: Starlette
# applies the most recently added middleware outermost, and CORS must attach its
# headers to every response — including gzip-compressed bodies and error
# responses — and answer preflight OPTIONS.
app.add_middleware(GZipMiddleware, minimum_size=1000)
# Outermost: every response (including CORS preflights and 500s) gets a request
# id and security headers, and is access-logged.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.middleware import ConcurrencyLimitMiddleware, RequestContextMiddleware  # noqa: E402

# In-flight requests <= DB connections per process (see the class docstring).
app.add_middleware(
    ConcurrencyLimitMiddleware,
    limit=settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW,
)
app.add_middleware(RequestContextMiddleware)

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(countries.router)
app.include_router(info.router)
app.include_router(guides.router)
app.include_router(universities.router)
app.include_router(images.router)
app.include_router(progress.router)
app.include_router(purchases.router)

from app.core.mailer import email_configured  # noqa: E402

if settings.is_production and not email_configured():
    logger.warning(
        "ENV=production with no email provider: password-reset emails will NOT be "
        "delivered. Set EMAIL_FROM and RESEND_API_KEY (or SMTP_*)."
    )

if settings.is_production and not settings.REDIS_URL:
    # Without REDIS_URL the rate limiter is in-memory and per-process: with
    # multiple workers or instances the effective limit multiplies and resets on
    # restart. start.sh forces --workers 1 in exactly this case, so the published
    # limits stay true, but scaling out needs Redis first.
    # See PRE_LAUNCH_SECURITY.md #5.
    #
    # Previously this warned on every production boot regardless of REDIS_URL,
    # which told an operator who HAD provisioned Redis that their limiter was
    # per-process. The condition now matches what is actually true.
    logger.warning(
        "ENV=production with no REDIS_URL: rate limiting is per-process only. "
        "start.sh will force a single worker. Provision Redis and set REDIS_URL "
        "before scaling out."
    )


@app.get("/", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "LandHere API"}


@app.get("/health/live", tags=["health"])
def liveness():
    """Process is up. Deliberately touches nothing external."""
    return {"status": "ok"}


_ready_cache: dict = {"at": 0.0, "ok": False}


def _check_database() -> bool:
    from sqlalchemy import text

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.exception("Readiness check failed: database unreachable")
        return False
    finally:
        db.close()


@app.get("/health/ready", tags=["health"])
async def readiness():
    """Essential dependencies reachable (currently: the database).

    Unauthenticated and outside the concurrency limiter, so the result is cached
    for 5 s: a flood of readiness probes costs at most one DB round trip per
    5 s instead of one pooled connection per request."""
    import time

    from starlette.concurrency import run_in_threadpool

    now = time.monotonic()
    if now - _ready_cache["at"] > 5:
        _ready_cache["ok"] = await run_in_threadpool(_check_database)
        _ready_cache["at"] = now
    if not _ready_cache["ok"]:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ok"}
