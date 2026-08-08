"""Initial migration

Revision ID: initial_schema
Revises: 
Create Date: 2026-08-08 09:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='User'),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)

    # 2. Api Keys Table
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='Active'),
        sa.Column('usage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_limit', sa.Integer(), nullable=False, server_default='25000'),
        sa.Column('expiry', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_api_keys_token_hash', 'api_keys', ['token_hash'], unique=True)

    # 3. Addresses Table
    op.create_table(
        'addresses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('raw_address', sa.Text(), nullable=False),
        sa.Column('normalized_address', sa.Text(), nullable=True),
        sa.Column('landmark', sa.String(255), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('locality', sa.String(255), nullable=True),
        sa.Column('area', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('district', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('pincode', sa.String(20), nullable=True),
        sa.Column('language', sa.String(50), nullable=False, server_default='en'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_addresses_pincode', 'addresses', ['pincode'], unique=False)

    # 4. Resolved Addresses Table
    op.create_table(
        'resolved_addresses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('address_id', sa.Uuid(), nullable=False),
        sa.Column('latitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('longitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('confidence', sa.Numeric(3, 2), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('matched_landmark', sa.String(255), nullable=True),
        sa.Column('matched_pincode', sa.String(20), nullable=True),
        sa.Column('nearby_pois', sa.Text(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='Success'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['address_id'], ['addresses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_resolved_lat_lon', 'resolved_addresses', ['latitude', 'longitude'], unique=False)

    # 5. Search History Table
    op.create_table(
        'search_history',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('raw_address', sa.Text(), nullable=False),
        sa.Column('resolved_address_id', sa.Uuid(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['resolved_address_id'], ['resolved_addresses.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_search_history_user_id', 'search_history', ['user_id'], unique=False)

    # 6. Audit Logs Table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('original_address', sa.Text(), nullable=False),
        sa.Column('corrected_address', sa.Text(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)

    # 7. Analytics Table
    op.create_table(
        'analytics',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('total_requests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_requests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('avg_confidence', sa.Numeric(3, 2), nullable=False, server_default='0.0'),
        sa.Column('avg_latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cache_hit_rate', sa.Numeric(5, 2), nullable=False, server_default='0.0'),
        sa.Column('timestamp', sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('timestamp')
    )

    # 8. Cache Table
    op.create_table(
        'cache',
        sa.Column('key', sa.String(255), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )

def downgrade() -> None:
    op.drop_table('cache')
    op.drop_table('analytics')
    op.drop_table('audit_logs')
    op.drop_table('search_history')
    op.drop_table('resolved_addresses')
    op.drop_table('addresses')
    op.drop_table('api_keys')
    op.drop_table('users')
