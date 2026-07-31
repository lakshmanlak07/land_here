from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # "development" (default) or "production". Production enables fail-fast
    # checks (strong SECRET_KEY) that would block local dev if always on.
    ENV: str = "development"

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
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

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        """Refuse to boot production with a weak/placeholder JWT signing key
        (PRE_LAUNCH_SECURITY.md #1). Only enforced when ENV=production so a
        casual local dev .env never blocks development."""
        if self.ENV.lower() == "production":
            weak = {
                "change-me",
                "temp-dev-key",
                "change-me-to-a-strong-random-secret",
                "test-only-secret-not-for-production",
            }
            if len(self.SECRET_KEY) < 32 or self.SECRET_KEY in weak:
                raise ValueError(
                    "ENV=production requires a strong SECRET_KEY (>=32 chars, "
                    "not a known placeholder). Generate one with: "
                    "python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
