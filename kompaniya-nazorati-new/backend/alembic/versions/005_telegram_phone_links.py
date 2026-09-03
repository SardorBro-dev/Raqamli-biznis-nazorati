"""Persist Telegram phone links.

Revision ID: 005_telegram_phone_links
Revises: 004_user_phone
"""
from alembic import op
import sqlalchemy as sa


revision = "005_telegram_phone_links"
down_revision = "004_user_phone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telegram_phone_links",
        sa.Column("phone", sa.String(length=13), nullable=False),
        sa.Column("chat_id", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("phone"),
        sa.UniqueConstraint("chat_id"),
    )


def downgrade() -> None:
    op.drop_table("telegram_phone_links")
