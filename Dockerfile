FROM python:3.12-slim

# Don't write .pyc files and don't buffer stdout/stderr.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps needed by psycopg2-binary.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Includes vendor/apple-root-ca/, which must contain Apple's PUBLIC root
# certificates for App Store verification. If that directory holds no
# certificate, /purchases/verify and /purchases/notifications return 503 —
# fail-closed by design, and a launch blocker. See its README.
COPY . .

# Migrate + start. Worker count is decided in start.sh, which refuses to run
# multiple workers without a shared (Redis) rate-limit backend — in-memory
# limits don't coordinate across processes, so N workers = N× every limit.
# Railway / Render inject PORT; default to 8000 for local Docker runs.
RUN chmod +x /app/start.sh \
    && useradd --system --uid 10001 --no-create-home --home-dir /app appuser
# Run as an unprivileged user that cannot modify the application code (files
# stay root-owned, world-readable): a compromised API process is neither root
# nor able to persist changes to the image. PYTHONDONTWRITEBYTECODE=1 means
# nothing needs to be written under /app at runtime.
USER appuser
CMD ["/app/start.sh"]
