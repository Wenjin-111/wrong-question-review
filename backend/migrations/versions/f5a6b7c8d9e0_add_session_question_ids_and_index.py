"""add_session_question_ids_and_index

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-07-28 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('review_session', sa.Column('question_ids', sa.JSON(), nullable=True))
    op.add_column('review_session', sa.Column('current_index', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('review_session', 'current_index')
    op.drop_column('review_session', 'question_ids')
