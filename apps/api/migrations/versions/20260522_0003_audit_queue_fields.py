"""Add queue fields to audit runs.

Revision ID: 20260522_0003
Revises: 20260522_0002
Create Date: 2026-05-22 00:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260522_0003"
down_revision: str | None = "20260522_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("audit_runs", sa.Column("queue_job_id", sa.String(length=80), nullable=True))
    op.add_column("audit_runs", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_runs", "error_message")
    op.drop_column("audit_runs", "queue_job_id")
