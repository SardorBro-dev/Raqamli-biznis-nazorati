"""Enforce unique user phone numbers.

Revision ID: 006_unique_user_phone
Revises: 005_telegram_phone_links
"""
from alembic import op


revision = "006_unique_user_phone"
down_revision = "005_telegram_phone_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ux_users_phone", "users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index("ux_users_phone", table_name="users")
