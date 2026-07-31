from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # "development" (default) or "production". Production enables fail-fast
    # checks (strong SECRET_KEY) that would block local dev if always on.
    ENV: str = "development"

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_strength(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\""
            )
        return v
    # Short-lived access token (1 hour). Clients transparently exchange a refresh
    # token for a new one via POST /auth/refresh; see app/routes/auth.py.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # Long-lived refresh token (30 days). Bounds how long a session can be kept
    # alive without re-entering credentials.
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    SCORECARD_API_KEY: str = ""
    OPENALEX_API_KEY: str = ""
    # Server-side Unsplash Access Key for GET /images/city. Never expose via the
    # mobile bundle (no EXPO_PUBLIC_ name). Empty = endpoint returns 503.
    UNSPLASH_ACCESS_KEY: str = ""

    # CORS allowed origins, comma-separated (e.g.
    # "https://app.example.com,https://admin.example.com"). Default "*" keeps local
    # Expo/LAN dev working. In production set this to the explicit web/prod origin(s)
    # you actually serve. Never combine "*" with credentialed CORS (enforced in
    # app/main.py): browsers reject that combination and it would be unsafe.
    CORS_ALLOW_ORIGINS: str = "*"

    # Rate-limit client-IP resolution. Forwarded headers (X-Forwarded-For) are
    # client-supplied and spoofable, so we only trust them when the app is
    # deployed behind a known reverse proxy. Default OFF: local dev (Expo → LAN
    # IP, no proxy) uses the direct socket peer, which is correct. In production,
    # set TRUST_PROXY_HEADERS=true and TRUSTED_PROXY_HOPS to the number of proxies
    # in front of the app (e.g. 1 for a single load balancer).
    TRUST_PROXY_HEADERS: bool = False
    TRUSTED_PROXY_HOPS: int = 1

    @property
    def cors_allow_origins(self) -> list[str]:
        """Parse CORS_ALLOW_ORIGINS into a clean list; falls back to ["*"] if empty."""
        origins = [o.strip() for o in self.CORS_ALLOW_ORIGINS.split(",") if o.strip()]
        return origins or ["*"]

    # Redis connection URL for shared rate limiting across multiple workers.
    # Example: redis://localhost:6379/0  or  rediss://user:pass@host:6380/0 (TLS)
    # Leave empty ("") to use the in-memory fallback (development / single-process).
    REDIS_URL: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENV.strip().lower() == "production"

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        """Refuse to boot production with a misconfiguration that would silently
        weaken security. Each check fails loudly at startup rather than serving
        traffic in a degraded state — a crashed deploy is recoverable, a live
        service with wildcard CORS and a placeholder key is not.

        SECRET_KEY length is enforced unconditionally by secret_key_strength;
        the checks here are the production-only additions.
        """
        if not self.is_production:
            return self

        errors: list[str] = []

        weak_secrets = {
            "change-me",
            "temp-dev-key",
            "change-me-to-a-strong-random-secret",
            "test-only-secret-not-for-production",
        }
        if self.SECRET_KEY in weak_secrets:
            errors.append(
                "SECRET_KEY is a known placeholder. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )

        # Wildcard CORS in production means any origin can drive the API with a
        # user's token. A warning is not enough — refuse.
        if "*" in self.cors_allow_origins:
            errors.append(
                "CORS_ALLOW_ORIGINS must list explicit origins in production "
                "(wildcard '*' and empty are both rejected)."
            )

        # Placeholder / local database URLs mean the deploy is pointed at nothing
        # real; failing here beats a confusing runtime error under load.
        db_url = self.DATABASE_URL.strip().lower()
        if (
            not db_url
            or "localhost" in db_url
            or "127.0.0.1" in db_url
            or "user:password" in db_url
            or "your-" in db_url
        ):
            errors.append(
                "DATABASE_URL looks like a placeholder or points at localhost."
            )

        # Behind a proxy the limiter needs to know whether X-Forwarded-For can be
        # trusted. Both answers are valid, but the choice must be deliberate:
        # trusting a spoofable header makes per-IP limits meaningless, and not
        # trusting it behind a load balancer puts every user in one bucket.
        if self.TRUST_PROXY_HEADERS and self.TRUSTED_PROXY_HOPS < 1:
            errors.append(
                "TRUST_PROXY_HEADERS=true requires TRUSTED_PROXY_HOPS >= 1 "
                "(the number of proxies in front of the app)."
            )

        if errors:
            raise ValueError(
                "Invalid production configuration (ENV=production):\n  - "
                + "\n  - ".join(errors)
            )
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
