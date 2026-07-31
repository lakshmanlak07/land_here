"""add_info_steps_indexes

Indexes the columns the GET /info/journey endpoint filters and orders on.

The hot query is:
  WHERE destination_code = $1
    AND (origin_code = $2 OR origin_code IS NULL)
  ORDER BY step_number ASC

* A leading-column index on destination_code handles the equality filter and
  lets Postgres narrow the scan before evaluating the origin_code condition.
* A separate index on origin_code speeds up the OR branch.
* step_number is low-cardinality and already used for ORDER BY after the WHERE
  narrows the set; a dedicated index wouldn't be used in practice but origin +
  step is useful as a composite if the planner prefers it.

Also indexes:
* users.origin_country_code and users.destination_country_code — FK columns
  that lack an index (the FK itself doesn't create one in Postgres).

Index-only migration: no schema or data change.

Revision ID: c3d5e7f9a1b2
Revises: b2f4a1c3d5e7
Create Date: 2026-06-27 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c3d5e7f9a1b2'
down_revision: Union[str, Sequence[str], None] = 'b2f4a1c3d5e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # info_steps: primary query filter + ordering
    op.create_index(
        "ix_info_steps_destination_code",
        "info_steps",
        ["destination_code"],
    )
    op.create_index(
        "ix_info_steps_origin_code",
        "info_steps",
        ["origin_code"],
    )
    op.create_index(
        "ix_info_steps_destination_phase_step",
        "info_steps",
        ["destination_code", "phase", "step_number"],
    )
    # users: FK columns without automatic indexes
    op.create_index(
        "ix_users_origin_country_code",
        "users",
        ["origin_country_code"],
    )
    op.create_index(
        "ix_users_destination_country_code",
        "users",
        ["destination_country_code"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_destination_country_code", table_name="users")
    op.drop_index("ix_users_origin_country_code", table_name="users")
    op.drop_index("ix_info_steps_destination_phase_step", table_name="info_steps")
    op.drop_index("ix_info_steps_origin_code", table_name="info_steps")
    op.drop_index("ix_info_steps_destination_code", table_name="info_steps")
