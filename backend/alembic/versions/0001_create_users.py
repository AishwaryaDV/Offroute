"""create users table

Revision ID: 0001
Revises:
Create Date: 2026-07-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "profile_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("profile_bio", sa.Text(), nullable=True),
        # FK to media.id added in Phase 2 when the media table exists.
        sa.Column("profile_cover_media_id", UUID(as_uuid=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("users")
