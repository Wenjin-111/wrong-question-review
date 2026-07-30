"""add_indexes_and_fulltext

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-07-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # FULLTEXT index for content search (MySQL only)
    op.execute(
        "ALTER TABLE question ADD FULLTEXT INDEX ix_question_content_fulltext (content_plain)"
    )

    # Performance indexes on frequently-filtered columns
    op.create_index('ix_question_user_deleted', 'question', ['user_id', 'is_deleted'], unique=False)
    op.create_index('ix_question_subject_id', 'question', ['subject_id'], unique=False)
    op.create_index('ix_question_question_type_id', 'question', ['question_type_id'], unique=False)
    op.create_index('ix_question_created_at', 'question', ['created_at'], unique=False)

    op.create_index('ix_review_record_user_mode', 'review_record', ['user_id', 'review_mode'], unique=False)
    op.create_index('ix_review_record_question_created', 'review_record', ['question_id', 'created_at'], unique=False)
    op.create_index('ix_review_record_user_id', 'review_record', ['user_id'], unique=False)

    op.create_index('ix_review_session_user_id', 'review_session', ['user_id'], unique=False)

    op.create_index('ix_chat_session_user_id', 'chat_session', ['user_id'], unique=False)
    op.create_index('ix_ai_chat_message_user_id', 'ai_chat_message', ['user_id'], unique=False)

    op.create_index('ix_question_draft_user_id', 'question_draft', ['user_id'], unique=False)

    op.create_index('ix_question_image_question_id', 'question_image', ['question_id'], unique=False)

    op.create_index('ix_subject_user_id', 'subject', ['user_id'], unique=False)
    op.create_index('ix_tag_user_id', 'tag', ['user_id'], unique=False)
    op.create_index('ix_question_type_user_id', 'question_type', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_question_type_user_id', table_name='question_type')
    op.drop_index('ix_tag_user_id', table_name='tag')
    op.drop_index('ix_subject_user_id', table_name='subject')

    op.drop_index('ix_question_image_question_id', table_name='question_image')

    op.drop_index('ix_question_draft_user_id', table_name='question_draft')

    op.drop_index('ix_ai_chat_message_user_id', table_name='ai_chat_message')
    op.drop_index('ix_chat_session_user_id', table_name='chat_session')

    op.drop_index('ix_review_session_user_id', table_name='review_session')

    op.drop_index('ix_review_record_user_id', table_name='review_record')
    op.drop_index('ix_review_record_question_created', table_name='review_record')
    op.drop_index('ix_review_record_user_mode', table_name='review_record')

    op.drop_index('ix_question_created_at', table_name='question')
    op.drop_index('ix_question_question_type_id', table_name='question')
    op.drop_index('ix_question_subject_id', table_name='question')
    op.drop_index('ix_question_user_deleted', table_name='question')

    op.execute("ALTER TABLE question DROP INDEX ix_question_content_fulltext")
