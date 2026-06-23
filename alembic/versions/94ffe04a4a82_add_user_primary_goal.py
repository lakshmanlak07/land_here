"""add_user_primary_goal

Revision ID: 94ffe04a4a82
Revises: 5423fb80fcbb
Create Date: 2026-06-24 02:28:05.223480

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94ffe04a4a82'
down_revision: Union[str, Sequence[str], None] = '5423fb80fcbb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('primary_goal', sa.String(length=30), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'primary_goal')
