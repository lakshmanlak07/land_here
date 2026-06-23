"""add_user_onboarding_fields

Revision ID: 5423fb80fcbb
Revises: a1b2c3d4e5f6
Create Date: 2026-06-24 01:45:16.135408

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5423fb80fcbb'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('stage', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('wants_to_work', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('wants_scholarships', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('concerns', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('first_month_priority', sa.String(length=30), nullable=True))
    op.add_column('users', sa.Column('first_timer', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('confidence', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'confidence')
    op.drop_column('users', 'first_timer')
    op.drop_column('users', 'first_month_priority')
    op.drop_column('users', 'concerns')
    op.drop_column('users', 'wants_scholarships')
    op.drop_column('users', 'wants_to_work')
    op.drop_column('users', 'stage')
