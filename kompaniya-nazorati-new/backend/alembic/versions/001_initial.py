"""Initial migration with users, companies, employees, work sessions

Revision ID: 001_initial
Revises: 
Create Date: 2026-08-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription_plans table
    op.create_table(
        'subscription_plans',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('monthly_price', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('company_limit', sa.Integer(), nullable=False),
        sa.Column('employee_limit', sa.Integer(), nullable=False),
        sa.Column('features', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=True),
        sa.Column('role', postgresql.ENUM('system_admin', 'company_owner', 'manager', 'employee', name='roleenum'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=False)
    
    # Create companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('owner_id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('owner_name', sa.String(100), nullable=True),
        sa.Column('address', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('working_days', sa.String(255), nullable=True),
        sa.Column('work_start_time', sa.String(10), nullable=True),
        sa.Column('work_end_time', sa.String(10), nullable=True),
        sa.Column('default_break_time', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('user_id', sa.String(50), nullable=False),
        sa.Column('company_id', sa.String(50), nullable=False),
        sa.Column('plan_id', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('purchased_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id')
    )
    
    # Create employees table
    op.create_table(
        'employees',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('user_id', sa.String(50), nullable=False),
        sa.Column('company_id', sa.String(50), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('position', sa.String(100), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('work_schedule', sa.String(100), nullable=True),
        sa.Column('work_start_time', sa.String(10), nullable=True),
        sa.Column('work_end_time', sa.String(10), nullable=True),
        sa.Column('break_start', sa.String(10), nullable=True),
        sa.Column('break_end', sa.String(10), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=False),
        sa.Column('idle_time', sa.Integer(), nullable=False),
        sa.Column('camera_enabled', sa.Boolean(), nullable=False),
        sa.Column('total_work_time', sa.Integer(), nullable=False),
        sa.Column('today_work_time', sa.Integer(), nullable=False),
        sa.Column('current_task', sa.String(255), nullable=True),
        sa.Column('last_activity', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create work_sessions table
    op.create_table(
        'work_sessions',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('employee_id', sa.String(50), nullable=False),
        sa.Column('company_id', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('total_work_minutes', sa.Integer(), nullable=False),
        sa.Column('break_start_time', sa.DateTime(), nullable=True),
        sa.Column('break_end_time', sa.DateTime(), nullable=True),
        sa.Column('total_break_minutes', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('work_sessions')
    op.drop_table('employees')
    op.drop_table('subscriptions')
    op.drop_table('companies')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('subscription_plans')
