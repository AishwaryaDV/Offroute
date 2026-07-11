"""circuit trip dates + user nationality

Revision ID: 8d12f3a9b0e1
Revises: 7c43a01122c3
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8d12f3a9b0e1'
down_revision: Union[str, None] = '7c43a01122c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('circuits', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('circuits', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('users', sa.Column('nationality', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'nationality')
    op.drop_column('circuits', 'end_date')
    op.drop_column('circuits', 'start_date')
