"""add notif_type enum values

point_added/point_deleted were already referenced in code (points.py
router) but never actually added to the live enum — only
star/clone/invite/invite_accepted existed. Those notifications have been
silently failing whenever a circuit has a second collaborator. Adding
them here plus the new audit-driven notification types.

Revision ID: b7ca89ef7144
Revises: 00798b9c98f1
Create Date: 2026-10-16 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7ca89ef7144'
down_revision: Union[str, None] = '00798b9c98f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = [
    "point_added",
    "point_deleted",
    "circuit_deleted",
    "media_deleted",
    "collaborator_removed",
    "assistant_write",
]


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE can't run inside a regular transaction block.
    with op.get_context().autocommit_block():
        for value in NEW_VALUES:
            op.execute(f"ALTER TYPE notif_type ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Postgres has no DROP VALUE for enums; removing one requires rebuilding
    # the type. Not worth it for a downgrade path on an append-only enum.
    pass
