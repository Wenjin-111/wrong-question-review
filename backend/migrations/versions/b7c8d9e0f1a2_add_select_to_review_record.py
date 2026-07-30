"""add_select_to_review_record

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-07-28 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a6b7c8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE review_record MODIFY COLUMN review_mode ENUM('free', 'spaced', 'select') NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE review_record MODIFY COLUMN review_mode ENUM('free', 'spaced') NOT NULL"
    )
