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

import sqlalchemy as sa
from alembic import op

revision: str = 'c3d5e7f9a1b2'
down_revision: Union[str, Sequence[str], None] = 'b2f4a1c3d5e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing(table: str) -> set:
    """Index names already present on `table`.

    ix_info_steps_destination_code is also created by the initial schema
    (5a2934344d6f), so on a database built from scratch this migration would
    fail with "index already exists" — which meant a fresh deploy crashed at
    boot, since the container runs `alembic upgrade head` on startup. Checking
    first makes each create_index idempotent without rewriting history for
    databases that already migrated past this revision.
    """
    bind = op.get_bind()
    return {ix["name"] for ix in sa.inspect(bind).get_indexes(table)}


def _create_if_missing(name: str, table: str, columns: list[str]) -> None:
    if name not in _existing(table):
        op.create_index(name, table, columns)


def _drop_if_present(name: str, table: str) -> None:
    if name in _existing(table):
        op.drop_index(name, table_name=table)


def upgrade() -> None:
    # info_steps: primary query filter + ordering
    _create_if_missing("ix_info_steps_destination_code", "info_steps", ["destination_code"])
    _create_if_missing("ix_info_steps_origin_code", "info_steps", ["origin_code"])
    _create_if_missing(
        "ix_info_steps_destination_phase_step",
        "info_steps",
        ["destination_code", "phase", "step_number"],
    )
    # users: FK columns without automatic indexes
    _create_if_missing("ix_users_origin_country_code", "users", ["origin_country_code"])
    _create_if_missing(
        "ix_users_destination_country_code", "users", ["destination_country_code"]
    )


def downgrade() -> None:
    _drop_if_present("ix_users_destination_country_code", "users")
    _drop_if_present("ix_users_origin_country_code", "users")
    _drop_if_present("ix_info_steps_destination_phase_step", "info_steps")
    # Deliberately NOT dropped here: ix_info_steps_destination_code AND
    # ix_info_steps_origin_code are both created by the initial schema
    # (5a2934344d6f, lines 72-73), whose own downgrade drops them. This
    # migration's upgrade() only creates them "if missing", which on any real
    # database is a no-op — so dropping them here would be removing something
    # this revision never created. Doing so broke `alembic downgrade base`:
    # this downgrade dropped ix_info_steps_origin_code, and the initial
    # schema's downgrade then failed with UndefinedObject trying to drop it
    # again, leaving the database partially torn down.
