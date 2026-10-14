"""users.university_id + user_step_progress

Revision ID: d1e3f5a7b9c1
Revises: c9d1e3f5a7b9
Create Date: 2026-10-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1e3f5a7b9c1"
down_revision: Union[str, Sequence[str], None] = "c9d1e3f5a7b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("university_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_users_university_id",
        "users",
        "universities",
        ["university_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_university_id", "users", ["university_id"])

    op.create_table(
        "user_step_progress",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "step_id",
            sa.Uuid(),
            sa.ForeignKey("info_steps.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_step_progress_step_id", "user_step_progress", ["step_id"])


def downgrade() -> None:
    op.drop_index("ix_user_step_progress_step_id", table_name="user_step_progress")
    op.drop_table("user_step_progress")
    op.drop_index("ix_users_university_id", table_name="users")
    op.drop_constraint("fk_users_university_id", "users", type_="foreignkey")
    op.drop_column("users", "university_id")
