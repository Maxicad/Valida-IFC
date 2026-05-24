"""Add audit snapshots.

Revision ID: 20260524_0004
Revises: 20260522_0003
Create Date: 2026-05-24 10:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260524_0004"
down_revision: str | None = "20260522_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_snapshots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("audit_run_id", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["audit_run_id"], ["audit_runs.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_snapshots_audit_run_id"), "audit_snapshots", ["audit_run_id"], unique=False)
    op.create_index(op.f("ix_audit_snapshots_token_hash"), "audit_snapshots", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_snapshots_token_hash"), table_name="audit_snapshots")
    op.drop_index(op.f("ix_audit_snapshots_audit_run_id"), table_name="audit_snapshots")
    op.drop_table("audit_snapshots")
