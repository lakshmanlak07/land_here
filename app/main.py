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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
