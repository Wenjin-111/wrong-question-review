"""add_session_id_to_review_record

Revision ID: c2d3e4f5a6b7
Revises: b1f2c3d4e5f6
Create Date: 2026-07-28 08:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1f2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('review_record', sa.Column('session_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_review_record_session', 'review_record', 'review_session', ['session_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_review_record_session', 'review_record', type_='foreignkey')
    op.drop_column('review_record', 'session_id')
