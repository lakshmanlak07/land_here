#!/bin/sh
# Container entrypoint: migrate, then start the API with a worker count that
# matches what the rate limiter can actually enforce.
#
# The rate limiter is per-process unless REDIS_URL is set (app/core/rate_limit.py).
# Running N workers with the in-memory backend multiplies every limit by N, so
# "30 logins/min" silently becomes 60. Rather than pretend distributed limiting
# exists, we force a single worker in that case and say so loudly.
set -e

alembic upgrade head

WORKERS="${WEB_CONCURRENCY:-2}"

if [ -z "${REDIS_URL:-}" ] && [ "$WORKERS" -gt 1 ]; then
  echo "WARNING: REDIS_URL is not set, so rate limiting is per-process only." >&2
  echo "WARNING: Forcing --workers 1 (requested ${WORKERS}) so published limits" >&2
  echo "WARNING: are the limits actually enforced. Provision Redis and set" >&2
  echo "WARNING: REDIS_URL to run multiple workers." >&2
  WORKERS=1
fi

# NOTE: no --forwarded-allow-ips='*'. Letting uvicorn rewrite client.host from a
# client-supplied X-Forwarded-For makes per-IP limits trivially spoofable. The
# app decides whether to trust that header itself, gated on TRUST_PROXY_HEADERS
# + TRUSTED_PROXY_HOPS (app/core/rate_limit.py::_client_ip).
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "$WORKERS"
