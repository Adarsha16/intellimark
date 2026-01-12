"""merge heads

Revision ID: 66d4a9752da5
Revises: 1d10c4a1fde5, b33fca2e6221
Create Date: 2026-01-12 20:47:40.379118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66d4a9752da5'
down_revision: Union[str, Sequence[str], None] = ('1d10c4a1fde5', 'b33fca2e6221')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
