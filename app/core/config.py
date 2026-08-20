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

    # ── LandHere Pro (one-time non-consumable in-app purchase) ────────────────
    # Apple's iOS bundle identifier. Every signed transaction we accept must
    # carry this exact bundleId, otherwise a transaction signed for a different
    # app would grant Pro here.
    APPLE_BUNDLE_ID: str = "com.landhere.app"
    # The IAP product identifier. Distinct from APPLE_BUNDLE_ID: the bundle ID
    # identifies the app, the product ID identifies the thing being sold.
    APPLE_PRO_PRODUCT_ID: str = "com.landhere.app.pro"
    # Numeric App Store Connect app id ("apple-id"). Apple's verifier requires
    # it to validate Production transactions. Not a secret — it appears in every
    # App Store URL — but it is unknown until the ASC record exists.
    APPLE_APP_APPLE_ID: int | None = None
    # Directory holding Apple's PUBLIC root CA certificates (AppleRootCA-G3.cer
    # and friends) from https://www.apple.com/certificateauthority/. These are
    # public trust anchors, not credentials. Empty = purchase verification is
    # not configured and /purchases/verify returns 503 rather than trusting
    # anything it cannot check.
    APPLE_ROOT_CA_DIR: str = ""
    # Accept StoreKit Sandbox transactions. Required for TestFlight, where every
    # purchase is a sandbox purchase. Defaults OFF so a public release does not
    # silently hand out Pro to anyone with a sandbox Apple ID.
    APPLE_ACCEPT_SANDBOX: bool = False
    # OCSP revocation checking of Apple's certificate chain during verification.
    # ON by default: it is the difference between "signed by a cert that chains
    # to Apple" and "signed by a cert Apple has not revoked". Costs a network
    # round trip per verification and fails closed if Apple's OCSP responder is
    # unreachable. Tests turn it off to stay offline.
    APPLE_ENABLE_ONLINE_CHECKS: bool = True

    # ── LandHere Pro on Google Play ────────────────────────────────────────────
    # Android's model is the opposite of Apple's. Apple hands the client a blob
    # signed by Apple, which we verify offline with public certificates and no
    # credential. Google hands the client an opaque token that proves nothing on
    # its own — the only way to know what it means is to ask Google, over an
    # authenticated connection. So Android verification needs a real secret and
    # Apple's does not.
    GOOGLE_PLAY_PACKAGE_NAME: str = "com.landhere.app"
    # Play's product identifier. Same string as the App Store's by convention;
    # they are separate records in separate consoles and need not match.
    GOOGLE_PLAY_PRO_PRODUCT_ID: str = "com.landhere.app.pro"
    # Service-account JSON for the Google Play Developer API, as raw JSON.
    # THIS IS A SECRET — a private key lives inside it. Inject it as a platform
    # secret at deploy time. Never commit it, never bake it into an image, and
    # never expose it to the mobile bundle. Empty = Android verification is
    # unavailable and the endpoints return 503.
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: str = ""
    # Alternative to the above: a path to the JSON file, for platforms that
    # mount secret files rather than injecting env vars. Ignored when
    # GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is set.
    GOOGLE_PLAY_SERVICE_ACCOUNT_FILE: str = ""
    # ── Pub/Sub push authentication for POST /purchases/notifications/google ──
    #
    # Apple signs its notifications, so that endpoint authenticates itself.
    # Google's RTDN messages carry no signature over their contents. Instead,
    # Pub/Sub can attach an OIDC identity token to the push request, which is
    # what we verify — issuer, signature, expiry, audience, and the calling
    # service account.
    #
    # NEITHER of these is a secret: the audience is our own URL, and the service
    # account email is an identifier, not a credential. The security comes from
    # Google's signature over the token, not from keeping these hidden.
    #
    # Both empty = the endpoint refuses every request. Fail closed.

    # The `aud` claim the token must carry. Set this to the exact audience
    # configured on the Pub/Sub push subscription — conventionally the endpoint
    # URL, e.g. https://api.landhere.app/purchases/notifications/google
    GOOGLE_PUBSUB_AUDIENCE: str = ""
    # The `email` claim the token must carry: the service account the push
    # subscription is configured to sign as, e.g.
    # landhere-rtdn@<project>.iam.gserviceaccount.com
    GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL: str = ""

    # Accept Play license-test purchases (testPurchaseContext.fopType == TEST).
    # The Android counterpart of APPLE_ACCEPT_SANDBOX, and off for the same
    # reason: a public release must not hand out Pro to license testers.
    GOOGLE_ACCEPT_TEST_PURCHASES: bool = False

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

    @model_validator(mode="before")
    @classmethod
    def _blank_means_unset(cls, data: object) -> object:
        """Treat a blank value as absent for every non-string setting.

        A dashboard that declares a variable but leaves it unfilled (Render's
        `sync: false`, and the obvious way to clear a value later) submits an
        empty string, not nothing. That turns "I do not have an App Store
        Connect id yet" into `APPLE_APP_APPLE_ID=""`, which fails int parsing
        and crashes the boot instead of leaving the endpoint at its intended
        503.

        Only non-str fields are stripped. "" is a meaningful value for the str
        settings and must keep reaching the field: REDIS_URL="" selects the
        in-memory limiter, and CORS_ALLOW_ORIGINS="" must stay a production
        boot failure rather than silently falling back to the dev default.
        """
        if not isinstance(data, dict):
            return data
        non_str = {
            name.lower()
            for name, field in cls.model_fields.items()
            if field.annotation is not str
        }
        for key in [k for k in data if isinstance(k, str) and k.lower() in non_str]:
            value = data[key]
            if isinstance(value, str) and not value.strip():
                del data[key]
        return data

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
