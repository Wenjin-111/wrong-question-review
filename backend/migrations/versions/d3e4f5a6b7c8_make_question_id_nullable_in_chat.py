"""make_question_id_nullable_in_chat

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-07-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ai_chat_message_ibfk_2', 'ai_chat_message', type_='foreignkey')
    op.drop_constraint('chat_session_ibfk_2', 'chat_session', type_='foreignkey')
    op.alter_column('ai_chat_message', 'question_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('chat_session', 'question_id', existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key('ai_chat_message_ibfk_2', 'ai_chat_message', 'question', ['question_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('chat_session_ibfk_2', 'chat_session', 'question', ['question_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('ai_chat_message_ibfk_2', 'ai_chat_message', type_='foreignkey')
    op.drop_constraint('chat_session_ibfk_2', 'chat_session', type_='foreignkey')
    op.alter_column('ai_chat_message', 'question_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('chat_session', 'question_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key('ai_chat_message_ibfk_2', 'ai_chat_message', 'question', ['question_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('chat_session_ibfk_2', 'chat_session', 'question', ['question_id'], ['id'], ondelete='CASCADE')
