"""add_location_name_to_events

Revision ID: 0e96eecb3279
Revises: f7e189b172ac
Create Date: 2026-01-12 18:27:51.478880

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e96eecb3279'
down_revision: Union[str, Sequence[str], None] = 'f7e189b172ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the location_name column as nullable first
    op.add_column('events', sa.Column('location_name', sa.String(), nullable=True))
    
    # Populate existing rows with the value from the location column
    op.execute("UPDATE events SET location_name = location WHERE location_name IS NULL")
    
    # Make the column NOT NULL
    op.alter_column('events', 'location_name', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('events', 'location_name')

