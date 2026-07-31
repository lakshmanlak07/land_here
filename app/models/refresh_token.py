import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RefreshToken(Base):
    """One row per issued refresh token — the server-side state that makes
    rotation replay-safe.

    Rotation alone is not enough: with stateless tokens the *previous* refresh
    token stays valid until its own expiry, so a stolen token remains usable for
    the full 30-day lifetime. Recording each token id lets us reject a token
    that has already been rotated, and treat that reuse as the theft signal it
    is: the whole family (this device's session lineage) is revoked, which
    logs out both the attacker and the victim rather than silently letting the
    attacker keep a live session.

    We store only the token *id* (the `jti` claim), never the token itself — the
    JWT signature is what proves authenticity, so there is no secret to leak here.
    """

    __tablename__ = "refresh_tokens"

    # The jti claim of the issued refresh token.
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Shared by every token in one login lineage (login → refresh → refresh …).
    # Revoking a family invalidates that device's session in one statement.
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Set when the token is rotated away, when its family is revoked on replay,
    # or on logout. Non-null = this token id is no longer usable.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_refresh_tokens_family_id", "family_id"),
        Index("ix_refresh_tokens_user_id", "user_id"),
    )
