"""initial_schema

Revision ID: 5a2934344d6f
Revises: 
Create Date: 2026-06-11 00:42:28.621550

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a2934344d6f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # countries must be created before tables that FK to it
    op.create_table(
        "countries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("student_visa_name", sa.String(length=200), nullable=True),
        sa.Column("official_immigration_url", sa.String(length=500), nullable=True),
        sa.Column("currency_code", sa.String(length=10), nullable=True),
        sa.Column("is_destination", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_origin", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=True),
        sa.Column("origin_country_code", sa.String(length=10), nullable=True),
        sa.Column("destination_country_code", sa.String(length=10), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["origin_country_code"], ["countries.code"]),
        sa.ForeignKeyConstraint(["destination_country_code"], ["countries.code"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "info_steps",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("origin_code", sa.String(length=10), nullable=True),
        sa.Column("destination_code", sa.String(length=10), nullable=False),
        sa.Column("phase", sa.String(length=50), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("official_source_name", sa.String(length=300), nullable=False),
        sa.Column("official_source_url", sa.String(length=500), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["destination_code"], ["countries.code"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_info_steps_destination_code", "info_steps", ["destination_code"])
    op.create_index("ix_info_steps_origin_code", "info_steps", ["origin_code"])

    op.create_table(
        "country_guides",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("country_code", sa.String(length=10), nullable=False),
        sa.Column("section", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("official_source_url", sa.String(length=500), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["country_code"], ["countries.code"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_country_guides_country_code", "country_guides", ["country_code"])


def downgrade() -> None:
    op.drop_index("ix_country_guides_country_code", table_name="country_guides")
    op.drop_table("country_guides")
    op.drop_index("ix_info_steps_origin_code", table_name="info_steps")
    op.drop_index("ix_info_steps_destination_code", table_name="info_steps")
    op.drop_table("info_steps")
    op.drop_table("users")
    op.drop_table("countries")
