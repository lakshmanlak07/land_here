import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# The two stores we sell through. Stored as a plain string rather than a native
# enum so adding a platform is a code change, not a migration.
PLATFORM_IOS = "ios"
PLATFORM_ANDROID = "android"
VALID_PLATFORMS = (PLATFORM_IOS, PLATFORM_ANDROID)


class Purchase(Base):
    """One row per verified App Store transaction — the server-side record that
    makes the Pro entitlement real rather than a device flag.

    The client cannot be the source of truth here. StoreKit hands the app a JWS
    blob signed by Apple; the app forwards it, the server verifies the signature
    chain (app/core/appstore.py) and only then writes a row. Entitlement is
    always read back from this table, never from the device.

    `platform_transaction_id` is the store's stable identifier for the purchase
    across restores, re-installs and device changes — Apple's
    `originalTransactionId`, or Google Play's `purchaseToken`. It is UNIQUE
    **per platform**, which is what stops one purchase from entitling several
    accounts: a second account presenting the same restored purchase collides
    instead of being granted Pro. That constraint is the entitlement model — do
    not relax it.

    The uniqueness is scoped by `platform` rather than global. Apple's ids and
    Google's tokens come from different namespaces with different formats, so a
    collision between them is implausible — but "implausible" is not a constraint,
    and a composite key says what we actually mean.

    One entitlement model, two stores: a user is Pro if they hold any
    unrevoked row here, whichever platform it came from. Somebody who buys on
    iOS and later signs in on Android keeps Pro, because entitlement belongs to
    the LandHere account, not to the device or the store. They cannot, however,
    *restore* the iOS purchase through Play — Apple and Google each only know
    about their own — so a cross-store move needs the original store, or support.

    Refunds set `revoked_at`, from an App Store Server Notification on iOS or a
    Play purchase that comes back CANCELLED on Android.
    """

    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # "ios" | "android" — which store this purchase came from.
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    # The store's stable id for the purchase. UNIQUE per platform — see docstring.
    # Google Play purchase tokens are long, hence 512 rather than 64.
    platform_transaction_id: Mapped[str] = mapped_column(String(512), nullable=False)
    # The specific transaction verified (differs from the stable id on an Apple
    # restore; on Play it is the order id). Support/debugging only, not unique.
    transaction_id: Mapped[str | None] = mapped_column(String(128))
    product_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # iOS: "Production" | "Sandbox". Android: "Production" | "Test".
    # Recorded so a support query can tell a real purchase from a test one
    # without re-verifying.
    environment: Mapped[str] = mapped_column(String(16), nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # Non-null = refunded or revoked by the store; the entitlement no longer counts.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_purchases_user_id", "user_id"),
        UniqueConstraint(
            "platform", "platform_transaction_id", name="uq_purchases_platform_txn"
        ),
    )


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
    # Which store sent it. Play's notifications are deduped here too, even though
    # their trust model differs (see app/routes/purchases.py).
    platform: Mapped[str] = mapped_column(
        String(16), nullable=False, default=PLATFORM_IOS
    )
    # Which purchase it referred to, when it referred to one. Not a foreign key:
    # a notification can arrive for a purchase we hold no row for.
    platform_transaction_id: Mapped[str | None] = mapped_column(String(512))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
