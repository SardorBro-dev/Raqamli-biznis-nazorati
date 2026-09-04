"""Add editable user profile image.

Revision ID: 003_user_profile
Revises: 002_communications
"""
from alembic import op
import sqlalchemy as sa


revision = "003_user_profile"
down_revision = "002_communications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image")
