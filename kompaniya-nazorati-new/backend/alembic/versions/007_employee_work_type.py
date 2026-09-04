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
    connection = op.get_bind()
    if any(column["name"] == "work_type" for column in sa.inspect(connection).get_columns("employees")):
        return
    op.add_column(
        "employees",
        sa.Column("work_type", sa.String(length=20), nullable=False, server_default="computer"),
    )


def downgrade() -> None:
    op.drop_column("employees", "work_type")
