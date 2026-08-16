"""add_purchase_notifications

Dedupe log for App Store Server Notifications.

Apple retries a notification until it receives a 2xx, so duplicates are normal
traffic rather than an edge case. The UNIQUE constraint on notification_uuid is
what makes handling one twice a no-op instead of a second state change — without
it, a retried REFUND arriving after a REFUND_REVERSED would leave the entitlement
in the wrong state.

No user_id column and no foreign key, on purpose: this is a log of what Apple
told us, it must outlive the account it referred to, and a notification can
arrive for a transaction we hold no row for.

Revision ID: f6a8b0c2d4e6
Revises: e5f7a9b1c3d5
Create Date: 2026-08-16 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f6a8b0c2d4e6'
down_revision: Union[str, Sequence[str], None] = 'e5f7a9b1c3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "purchase_notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("notification_uuid", sa.String(length=64), nullable=False),
        sa.Column("notification_type", sa.String(length=64), nullable=False),
        sa.Column("subtype", sa.String(length=64), nullable=True),
        sa.Column("original_transaction_id", sa.String(length=64), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "notification_uuid", name="uq_purchase_notifications_notification_uuid"
        ),
    )


def downgrade() -> None:
    # Drops only what this revision created — nothing here is shared with
    # another migration (the failure mode repaired in c3d5e7f9a1b2).
    op.drop_table("purchase_notifications")
