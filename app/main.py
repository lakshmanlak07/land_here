import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routes import account, auth, countries, info, guides, universities

logger = logging.getLogger("landhere")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(application: FastAPI):
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(countries.router)
app.include_router(info.router)
app.include_router(guides.router)
app.include_router(universities.router)


@app.get("/", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "LandHere API"}
