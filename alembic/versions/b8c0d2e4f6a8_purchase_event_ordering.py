"""purchase_event_ordering

Add `purchases.last_event_signed_at` so store notifications are applied in EVENT
order rather than ARRIVAL order.

Arrival order is not event order. Apple documents `signedDate` as the UNIX time
at which the App Store signed the JWS, which is the App Store's own timestamp
for when the event occurred. A retry, a queue delay, or a transient failure on
our side can deliver a REFUND after the REFUND_REVERSED that undid it; applying
them as they land would leave a paying customer locked out of something they own.

NULL means no store event has been applied to that row yet — a purchase created
by a direct verify — and any event may apply to it.

Revision ID: b8c0d2e4f6a8
Revises: a7b9c1d3e5f7
Create Date: 2026-08-18 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b8c0d2e4f6a8'
down_revision: Union[str, Sequence[str], None] = 'a7b9c1d3e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "purchases",
        sa.Column("last_event_signed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # Dropping this loses only the ordering watermark. Entitlement state itself
    # lives in revoked_at and is untouched, so a downgrade degrades to the old
    # last-write-wins behaviour rather than corrupting anything.
    op.drop_column("purchases", "last_event_signed_at")
