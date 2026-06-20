import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import auth, countries, info, guides, universities

logger = logging.getLogger("landhere")

app = FastAPI(
    title="LandHere API",
    description="Information-first companion for international students",
    version="1.0.0",
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
# With allow_credentials=False a wildcard origin is safe: browsers will share
# responses but cannot attach a victim's cookies/credentials to the request,
# and the native mobile client isn't subject to CORS at all. Locking
# allow_origins to the real web/prod domain(s) is a production step — see
# PRE_LAUNCH_SECURITY.md (#2). Do NOT combine "*" with allow_credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(countries.router)
app.include_router(info.router)
app.include_router(guides.router)
app.include_router(universities.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "LandHere API"}
