"""add slug to circuits

Revision ID: f5a1b2c3d4e5
Revises: e378c9f9a018
Create Date: 2026-07-24 00:00:00.000000

"""
from typing import Union

import re

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f5a1b2c3d4e5'
down_revision: Union[str, None] = 'e11722a75fc9'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")[:80] or "circuit"


def upgrade() -> None:
    op.add_column('circuits', sa.Column('slug', sa.Text(), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, owner_id, title FROM circuits WHERE slug IS NULL")).fetchall()
    seen: dict[tuple, int] = {}
    for row_id, owner_id, title in rows:
        base = _slugify(title)
        key = (str(owner_id), base)
        count = seen.get(key, 0)
        slug = base if count == 0 else f"{base}-{count}"
        seen[key] = count + 1
        conn.execute(sa.text("UPDATE circuits SET slug = :slug WHERE id = :id"), {"slug": slug, "id": row_id})

    op.create_unique_constraint('uq_circuits_owner_slug', 'circuits', ['owner_id', 'slug'])


def downgrade() -> None:
    op.drop_constraint('uq_circuits_owner_slug', 'circuits', type_='unique')
    op.drop_column('circuits', 'slug')
