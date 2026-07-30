"""add_chat_session

Revision ID: 66fe509c1b7a
Revises: 92a4b4bb2d3b
Create Date: 2026-07-27 17:51:59.482483

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66fe509c1b7a'
down_revision: Union[str, None] = '92a4b4bb2d3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('chat_session',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('question_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['question_id'], ['question.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    # Alter existing ai_chat_message table instead of dropping it
    op.add_column('ai_chat_message', sa.Column('session_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'ai_chat_message_session_id_fk', 'ai_chat_message', 'chat_session',
        ['session_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index(op.f('ix_ai_chat_message_session_id'), 'ai_chat_message', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_chat_message_session_id'), table_name='ai_chat_message')
    op.drop_constraint('ai_chat_message_session_id_fk', 'ai_chat_message', type_='foreignkey')
    op.drop_column('ai_chat_message', 'session_id')
    op.drop_table('chat_session')
