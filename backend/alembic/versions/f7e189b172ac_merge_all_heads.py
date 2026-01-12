"""merge_all_heads

Revision ID: f7e189b172ac
Revises: 1d10c4a1fde5, b33fca2e6221
Create Date: 2026-01-12 18:27:33.218334

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e189b172ac'
down_revision: Union[str, Sequence[str], None] = ('1d10c4a1fde5', 'b33fca2e6221')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
