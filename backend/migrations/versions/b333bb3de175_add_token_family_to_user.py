"""add_token_family_to_user

Revision ID: b333bb3de175
Revises: e0f1a2b3c4d5
Create Date: 2026-07-30 10:45:59.546311

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b333bb3de175'
down_revision: Union[str, None] = 'e0f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('token_family', sa.String(length=36), nullable=True))
    # Fill existing rows with unique UUIDs
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM user")).fetchall()
    for (uid,) in rows:
        conn.execute(
            sa.text("UPDATE user SET token_family = :fam WHERE id = :id"),
            {"fam": uuid.uuid4().hex, "id": uid},
        )
    op.alter_column('user', 'token_family', existing_type=sa.String(36), nullable=False)


def downgrade() -> None:
    op.drop_column('user', 'token_family')
