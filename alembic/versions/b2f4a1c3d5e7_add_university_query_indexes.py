"""add_university_query_indexes

Index the columns the rankings endpoint (app/routes/universities.py) sorts and
filters on, so the list query stops doing a full scan + in-memory sort as the
table grows:

  * Every request runs WHERE has_full_score = true ORDER BY landhere_score DESC.
    A composite (has_full_score, landhere_score) index serves the filter and the
    sort from one structure (leading equality column, then the ordered column).
  * state and tuition_out_of_state are optional equality/range filters — one
    single-column index each.

`name` is filtered with ILIKE '%...%' (leading-wildcard substring), which a
plain B-tree cannot accelerate, so it is intentionally left unindexed here.

Index-only migration: no schema/data change.

Revision ID: b2f4a1c3d5e7
Revises: 94ffe04a4a82
Create Date: 2026-06-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2f4a1c3d5e7'
down_revision: Union[str, Sequence[str], None] = '94ffe04a4a82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "ix_universities_full_score_landhere",
        "universities",
        ["has_full_score", "landhere_score"],
    )
    op.create_index("ix_universities_state", "universities", ["state"])
    op.create_index(
        "ix_universities_tuition_out_of_state",
        "universities",
        ["tuition_out_of_state"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_universities_tuition_out_of_state", table_name="universities")
    op.drop_index("ix_universities_state", table_name="universities")
    op.drop_index("ix_universities_full_score_landhere", table_name="universities")
