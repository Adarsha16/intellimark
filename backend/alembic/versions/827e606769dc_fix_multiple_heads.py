"""Fix multiple heads

Revision ID: 827e606769dc
Revises: 233d28814cf7, cc0570e09df0
Create Date: 2026-01-11 23:10:07.672739

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '827e606769dc'
down_revision: Union[str, Sequence[str], None] = ('233d28814cf7', 'cc0570e09df0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
