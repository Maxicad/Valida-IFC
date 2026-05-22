"""Add detailed audit result fields.

Revision ID: 20260522_0002
Revises: 20260521_0001
Create Date: 2026-05-22 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260522_0002"
down_revision: str | None = "20260521_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("audit_results", sa.Column("score_value", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("audit_results", sa.Column("fix_suggestion", sa.Text(), nullable=True))
    op.add_column("audit_results", sa.Column("is_summary", sa.Boolean(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("audit_results", "is_summary")
    op.drop_column("audit_results", "fix_suggestion")
    op.drop_column("audit_results", "score_value")
