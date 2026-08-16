import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Purchase(Base):
    """One row per verified App Store transaction — the server-side record that
    makes the Pro entitlement real rather than a device flag.

    The client cannot be the source of truth here. StoreKit hands the app a JWS
    blob signed by Apple; the app forwards it, the server verifies the signature
    chain (app/core/appstore.py) and only then writes a row. Entitlement is
    always read back from this table, never from the device.

    `original_transaction_id` is Apple's stable identifier for a purchase across
    restores, re-installs and device changes. It is UNIQUE, which is what stops
    one purchase from entitling several accounts: a second account presenting
    the same restored transaction collides instead of being granted Pro. That
    unique constraint is the entitlement model — do not relax it.

    Refunds set `revoked_at`. Nothing writes it yet: revocation arrives either
    from a `revocationDate` present on a re-verified transaction, or from App
    Store Server Notifications, which are not wired up in this phase.
    """

    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Apple's stable id for the purchase. UNIQUE — see class docstring.
    original_transaction_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    # The specific transaction that was verified (differs from the original on
    # a restore). Kept for support/debugging, deliberately not unique.
    transaction_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # "Production" or "Sandbox". Recorded so a support query can tell a real
    # purchase from a TestFlight one without re-verifying.
    environment: Mapped[str] = mapped_column(String(16), nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # Non-null = refunded or revoked by Apple; the entitlement no longer counts.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_purchases_user_id", "user_id"),)


class PurchaseNotification(Base):
    """One row per App Store Server Notification we have accepted.

    Exists for exactly one reason: Apple retries notifications until it gets a
    2xx, so the same notification arrives more than once as a matter of course.
    `notification_uuid` is UNIQUE, which turns "handle this twice" into a no-op
    instead of a second state change. Without it, a retried REFUND followed by a
    retried REFUND_REVERSED could land out of order and leave the entitlement
    wrong.

    Deliberately NOT linked to a user: it is a log of what Apple told us, and it
    must survive account deletion so a replayed notification for a deleted
    account is still recognised as already-seen. It holds no personal data —
    Apple's opaque identifiers only.
    """

    __tablename__ = "purchase_notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    notification_uuid: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    notification_type: Mapped[str] = mapped_column(String(64), nullable=False)
    subtype: Mapped[str | None] = mapped_column(String(64))
    # Which purchase it referred to, when it referred to one. Not a foreign key:
    # a notification can arrive for a transaction we have no row for.
    original_transaction_id: Mapped[str | None] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
