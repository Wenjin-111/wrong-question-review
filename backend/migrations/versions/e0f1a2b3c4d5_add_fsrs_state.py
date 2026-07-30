"""add_fsrs_state

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-07-28 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('fsrs_state',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('stability', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('difficulty', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('reps', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('state', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_review_at', sa.DateTime(), nullable=True),
        sa.Column('next_review_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['question_id'], ['question.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'question_id')
    )
    op.create_index('ix_fsrs_state_user_due', 'fsrs_state', ['user_id', 'next_review_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_fsrs_state_user_due', table_name='fsrs_state')
    op.drop_table('fsrs_state')
