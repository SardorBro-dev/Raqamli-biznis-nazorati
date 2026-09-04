"""Add company messages and news.

Revision ID: 002_communications
Revises: 001_initial
"""

from alembic import op
import sqlalchemy as sa


revision = "002_communications"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column("id", sa.String(50), nullable=False),
        sa.Column("company_id", sa.String(50), nullable=False),
        sa.Column("sender_id", sa.String(50), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_company_id", "messages", ["company_id"])

    op.create_table(
        "news",
        sa.Column("id", sa.String(50), nullable=False),
        sa.Column("company_id", sa.String(50), nullable=False),
        sa.Column("author_id", sa.String(50), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_news_company_id", "news", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_news_company_id", table_name="news")
    op.drop_table("news")
    op.drop_index("ix_messages_company_id", table_name="messages")
    op.drop_table("messages")