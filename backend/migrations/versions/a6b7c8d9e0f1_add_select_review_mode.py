"""add_select_review_mode

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-07-28 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a6b7c8d9e0f1'
down_revision: Union[str, None] = 'f5a6b7c8d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE review_session MODIFY COLUMN review_mode ENUM('free', 'spaced', 'select') NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE review_session MODIFY COLUMN review_mode ENUM('free', 'spaced') NOT NULL"
    )
