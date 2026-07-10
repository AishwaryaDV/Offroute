"""create_circuits_points_media

Revision ID: 7c43a01122c3
Revises: 0001
Create Date: 2026-07-10 11:40:42.707115

"""
from typing import Sequence, Union

from alembic import op
import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7c43a01122c3'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('circuits',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('owner_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('cover_media_id', sa.UUID(), nullable=True),
    sa.Column('visibility', sa.Enum('private', 'shared', 'public', name='visibility', create_type=True), server_default='private', nullable=False),
    sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('points',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('circuit_id', sa.UUID(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('location', geoalchemy2.types.Geography(geometry_type='POINT', srid=4326, from_text='ST_GeogFromText', name='geography'), nullable=False),
    sa.Column('visited_at', sa.Date(), nullable=True),
    sa.Column('category', sa.Enum('food', 'drink', 'stay', 'viewpoint', 'activity', 'nature', 'culture', 'hidden_gem', 'other', name='point_category', create_type=True), nullable=True),
    sa.Column('rating', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['circuit_id'], ['circuits.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('media',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('point_id', sa.UUID(), nullable=True),
    sa.Column('circuit_id', sa.UUID(), nullable=True),
    sa.Column('type', sa.Enum('photo', 'video', 'file', name='media_type', create_type=True), nullable=False),
    sa.Column('storage_path', sa.Text(), nullable=False),
    sa.Column('caption', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['circuit_id'], ['circuits.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['point_id'], ['points.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # Block Supabase PostgREST access (we use direct Postgres connections only)
    op.execute("ALTER TABLE circuits ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE points ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE media ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table('media')
    op.drop_table('points')
    op.drop_table('circuits')
    sa.Enum(name='visibility').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='point_category').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='media_type').drop(op.get_bind(), checkfirst=True)
