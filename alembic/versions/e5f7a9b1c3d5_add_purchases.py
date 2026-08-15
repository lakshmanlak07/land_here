"""add_purchases

Server-side record of verified App Store transactions — the entitlement store
for LandHere Pro.

The unique constraint on original_transaction_id is the security control, not a
tidiness measure: it is what stops one $1.99 purchase from being restored onto
several accounts. Apple keeps original_transaction_id stable across restores,
reinstalls and device changes, so a second account presenting the same restored
transaction collides here instead of being granted Pro.

Rows are removed with the user by ON DELETE CASCADE, matching the deletion
promise in the privacy policy and the behaviour already covered for
refresh_tokens.

Revision ID: e5f7a9b1c3d5
Revises: d4e6f8a0b2c4
Create Date: 2026-08-16 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5f7a9b1c3d5'
down_revision: Union[str, Sequence[str], None] = 'd4e6f8a0b2c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "purchases",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_transaction_id", sa.String(length=64), nullable=False),
        sa.Column("transaction_id", sa.String(length=64), nullable=False),
        sa.Column("product_id", sa.String(length=128), nullable=False),
        sa.Column("environment", sa.String(length=16), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "original_transaction_id", name="uq_purchases_original_transaction_id"
        ),
    )
    op.create_index("ix_purchases_user_id", "purchases", ["user_id"])


def downgrade() -> None:
    # Mirror of upgrade() exactly. Nothing here is created by another revision,
    # so this drops only what this revision made — the failure mode repaired in
    # c3d5e7f9a1b2, kept in mind.
    op.drop_index("ix_purchases_user_id", table_name="purchases")
    op.drop_table("purchases")
