from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    SCORECARD_API_KEY: str = ""
    OPENALEX_API_KEY: str = ""

    # Rate-limit client-IP resolution. Forwarded headers (X-Forwarded-For) are
    # client-supplied and spoofable, so we only trust them when the app is
    # deployed behind a known reverse proxy. Default OFF: local dev (Expo → LAN
    # IP, no proxy) uses the direct socket peer, which is correct. In production,
    # set TRUST_PROXY_HEADERS=true and TRUSTED_PROXY_HOPS to the number of proxies
    # in front of the app (e.g. 1 for a single load balancer).
    TRUST_PROXY_HEADERS: bool = False
    TRUSTED_PROXY_HOPS: int = 1

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
