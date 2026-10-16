"""info_steps: unique natural key (origin, destination, phase, step_number)

The seed matches journey steps on this key. Without a constraint, two seeds
running at once could insert every step twice, and later seeds would never
repair it. Boot is now serialized (app/core/boot.py); this is the backstop.

Revision ID: e7a9c1d3f5b7
Revises: d1e3f5a7b9c1
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = "e7a9c1d3f5b7"
down_revision: Union[str, Sequence[str], None] = "d1e3f5a7b9c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_info_steps_corridor_phase_step",
        "info_steps",
        ["origin_code", "destination_code", "phase", "step_number"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_info_steps_corridor_phase_step", "info_steps", type_="unique")
