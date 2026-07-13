"""add share_token to circuits

Revision ID: a1b2c3d4e5f6
Revises: 8d12f3a9b0e1
Create Date: 2026-07-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8d12f3a9b0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('circuits', sa.Column('share_token', sa.Text(), nullable=True))
    op.create_unique_constraint('uq_circuits_share_token', 'circuits', ['share_token'])


def downgrade() -> None:
    op.drop_constraint('uq_circuits_share_token', 'circuits', type_='unique')
    op.drop_column('circuits', 'share_token')
