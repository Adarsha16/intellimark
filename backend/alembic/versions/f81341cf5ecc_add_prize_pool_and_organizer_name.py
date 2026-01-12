"""add_prize_pool_and_organizer_name

Revision ID: f81341cf5ecc
Revises: 66d4a9752da5
Create Date: 2026-01-12 21:15:55.983302

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f81341cf5ecc'
down_revision: Union[str, Sequence[str], None] = '66d4a9752da5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if columns exist before adding them
    op.add_column('events', sa.Column('prize_pool', sa.String(), nullable=True))
    op.add_column('events', sa.Column('organizer_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('events', 'organizer_name')
    op.drop_column('events', 'prize_pool')
