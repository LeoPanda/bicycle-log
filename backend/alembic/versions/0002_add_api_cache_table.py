"""add_api_cache_table

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-28 09:23:12.085847

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('api_cache',
        sa.Column('cache_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('response_data', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('expires_at', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column('created_at', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint('cache_key')
    )
    with op.batch_alter_table('api_cache', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_api_cache_cache_key'), ['cache_key'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('api_cache', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_api_cache_cache_key'))

    op.drop_table('api_cache')
