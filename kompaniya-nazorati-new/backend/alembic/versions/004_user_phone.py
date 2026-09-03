"""Add phone number to users.

Revision ID: 004_user_phone
Revises: 003_user_profile
"""
from alembic import op
import sqlalchemy as sa


revision = "004_user_phone"
down_revision = "003_user_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=13), nullable=True))
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_column("users", "phone")
