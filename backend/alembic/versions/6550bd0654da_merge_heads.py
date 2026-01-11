"""merge heads

Revision ID: 6550bd0654da
Revises: 233d28814cf7, cc0570e09df0
Create Date: 2026-01-11 21:36:05.253926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6550bd0654da'
down_revision: Union[str, Sequence[str], None] = ('233d28814cf7', 'cc0570e09df0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
