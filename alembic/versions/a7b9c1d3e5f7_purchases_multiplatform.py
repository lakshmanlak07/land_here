"""purchases_multiplatform

Make the entitlement tables platform-aware so Google Play purchases can live
alongside App Store ones.

Three changes to `purchases`:

  * new `platform` column ("ios" | "android"). Existing rows are backfilled to
    "ios" because that is what they are — the App Store was the only store when
    they were written.
  * `original_transaction_id` -> `platform_transaction_id`, widened 64 -> 512.
    The old name was Apple's vocabulary; Google Play's equivalent is a
    `purchaseToken`, which is far longer than 64 characters and would have been
    silently truncated or rejected.
  * the single-column UNIQUE becomes UNIQUE (platform, platform_transaction_id).
    Apple ids and Play tokens come from different namespaces, so a collision was
    implausible — but the composite key states the actual invariant instead of
    relying on that.

`transaction_id` becomes nullable and widens to 128: on Play the nearest
equivalent is `orderId`, which the API documents as possibly absent.

`purchase_notifications` gets the same `platform` / `platform_transaction_id`
treatment.

The UNIQUE constraint is the entitlement model — one store purchase entitles one
LandHere account. Downgrading this revision narrows the column back to 64
characters, which would fail on any stored Play token; that is why the downgrade
deletes Android rows first, and why it is destructive by necessity rather than by
accident.

Revision ID: a7b9c1d3e5f7
Revises: f6a8b0c2d4e6
Create Date: 2026-08-17 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a7b9c1d3e5f7'
down_revision: Union[str, Sequence[str], None] = 'f6a8b0c2d4e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── purchases ────────────────────────────────────────────────────────────
    # Added with a server_default so the NOT NULL applies to existing rows, then
    # dropped so future inserts must state the platform explicitly rather than
    # silently defaulting to iOS.
    op.add_column(
        "purchases",
        sa.Column("platform", sa.String(length=16), nullable=False, server_default="ios"),
    )
    op.alter_column("purchases", "platform", server_default=None)

    op.drop_constraint(
        "uq_purchases_original_transaction_id", "purchases", type_="unique"
    )
    op.alter_column(
        "purchases",
        "original_transaction_id",
        new_column_name="platform_transaction_id",
        existing_type=sa.String(length=64),
        type_=sa.String(length=512),
        existing_nullable=False,
    )
    op.alter_column(
        "purchases",
        "transaction_id",
        existing_type=sa.String(length=64),
        type_=sa.String(length=128),
        existing_nullable=False,
        nullable=True,
    )
    op.create_unique_constraint(
        "uq_purchases_platform_txn",
        "purchases",
        ["platform", "platform_transaction_id"],
    )

    # ── purchase_notifications ───────────────────────────────────────────────
    op.add_column(
        "purchase_notifications",
        sa.Column("platform", sa.String(length=16), nullable=False, server_default="ios"),
    )
    op.alter_column("purchase_notifications", "platform", server_default=None)
    op.alter_column(
        "purchase_notifications",
        "original_transaction_id",
        new_column_name="platform_transaction_id",
        existing_type=sa.String(length=64),
        type_=sa.String(length=512),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Android rows cannot survive this: a Play purchase token does not fit in
    # the 64-character column this restores, and there is no iOS equivalent to
    # map it to. Deleting them is the only honest option — losing an entitlement
    # is recoverable by restoring the purchase, whereas a truncated token would
    # be corrupt data that still looks valid.
    op.execute("DELETE FROM purchases WHERE platform = 'android'")
    op.execute("DELETE FROM purchase_notifications WHERE platform = 'android'")

    op.alter_column(
        "purchase_notifications",
        "platform_transaction_id",
        new_column_name="original_transaction_id",
        existing_type=sa.String(length=512),
        type_=sa.String(length=64),
        existing_nullable=True,
    )
    op.drop_column("purchase_notifications", "platform")

    op.drop_constraint("uq_purchases_platform_txn", "purchases", type_="unique")
    op.alter_column(
        "purchases",
        "transaction_id",
        existing_type=sa.String(length=128),
        type_=sa.String(length=64),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "purchases",
        "platform_transaction_id",
        new_column_name="original_transaction_id",
        existing_type=sa.String(length=512),
        type_=sa.String(length=64),
        existing_nullable=False,
    )
    op.create_unique_constraint(
        "uq_purchases_original_transaction_id",
        "purchases",
        ["original_transaction_id"],
    )
    op.drop_column("purchases", "platform")
