"""Store whether an employee works at a computer or performs physical work.

Revision ID: 007_employee_work_type
Revises: 006_unique_user_phone
"""
from alembic import op
import sqlalchemy as sa


revision = "007_employee_work_type"
down_revision = "006_unique_user_phone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("work_type", sa.String(length=20), nullable=False, server_default="computer"),
    )
    op.alter_column("employees", "work_type", server_default=None)


def downgrade() -> None:
    op.drop_column("employees", "work_type")
