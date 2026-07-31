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

COPY . .

# Migrate + start. Worker count is decided in start.sh, which refuses to run
# multiple workers without a shared (Redis) rate-limit backend — in-memory
# limits don't coordinate across processes, so N workers = N× every limit.
# Railway / Render inject PORT; default to 8000 for local Docker runs.
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
