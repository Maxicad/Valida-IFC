"""Initial database schema.

Revision ID: 20260521_0001
Revises:
Create Date: 2026-05-21 21:55:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260521_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=60), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("client", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discipline", sa.String(length=120), nullable=True),
        sa.Column("phase", sa.String(length=120), nullable=True),
        sa.Column("responsible", sa.String(length=180), nullable=True),
        sa.Column("status", sa.String(length=80), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "criteria_sets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=60), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ifc_files",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("ifc_schema", sa.String(length=40), nullable=True),
        sa.Column("ifc_version", sa.String(length=40), nullable=True),
        sa.Column("uploaded_by", sa.String(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=60), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ifc_files_project_id", "ifc_files", ["project_id"], unique=False)

    op.create_table(
        "criteria",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("criteria_set_id", sa.String(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("rule_type", sa.String(length=80), nullable=False),
        sa.Column("entity_ifc", sa.String(length=120), nullable=True),
        sa.Column("property_name", sa.String(length=120), nullable=True),
        sa.Column("operator", sa.String(length=80), nullable=True),
        sa.Column("expected_value", sa.Text(), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("fix_suggestion", sa.Text(), nullable=True),
        sa.Column("reference", sa.String(length=180), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("natural_language_source", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["criteria_set_id"], ["criteria_sets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_criteria_code"), "criteria", ["code"], unique=False)
    op.create_index("ix_criteria_criteria_set_id", "criteria", ["criteria_set_id"], unique=False)

    op.create_table(
        "audit_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("ifc_file_id", sa.String(), nullable=False),
        sa.Column("criteria_set_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=60), nullable=False),
        sa.Column("score_percent", sa.Float(), nullable=True),
        sa.Column("score_low", sa.Float(), nullable=True),
        sa.Column("score_moderate", sa.Float(), nullable=True),
        sa.Column("score_high", sa.Float(), nullable=True),
        sa.Column("total_criteria", sa.Integer(), nullable=False),
        sa.Column("approved_criteria", sa.Integer(), nullable=False),
        sa.Column("failed_criteria", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["criteria_set_id"], ["criteria_sets.id"]),
        sa.ForeignKeyConstraint(["ifc_file_id"], ["ifc_files.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_runs_project_id", "audit_runs", ["project_id"], unique=False)
    op.create_index("ix_audit_runs_ifc_file_id", "audit_runs", ["ifc_file_id"], unique=False)

    op.create_table(
        "audit_results",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("audit_run_id", sa.String(), nullable=False),
        sa.Column("criteria_id", sa.String(), nullable=False),
        sa.Column("element_guid", sa.String(length=80), nullable=True),
        sa.Column("element_type", sa.String(length=120), nullable=True),
        sa.Column("element_name", sa.String(length=180), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("actual_value", sa.Text(), nullable=True),
        sa.Column("expected_value", sa.Text(), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["audit_run_id"], ["audit_runs.id"]),
        sa.ForeignKeyConstraint(["criteria_id"], ["criteria.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_results_audit_run_id", "audit_results", ["audit_run_id"], unique=False)
    op.create_index("ix_audit_results_element_guid", "audit_results", ["element_guid"], unique=False)

    op.create_table(
        "reports",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("audit_run_id", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("format", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["audit_run_id"], ["audit_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_audit_run_id", "reports", ["audit_run_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_reports_audit_run_id", table_name="reports")
    op.drop_table("reports")
    op.drop_index("ix_audit_results_element_guid", table_name="audit_results")
    op.drop_index("ix_audit_results_audit_run_id", table_name="audit_results")
    op.drop_table("audit_results")
    op.drop_index("ix_audit_runs_ifc_file_id", table_name="audit_runs")
    op.drop_index("ix_audit_runs_project_id", table_name="audit_runs")
    op.drop_table("audit_runs")
    op.drop_index("ix_criteria_criteria_set_id", table_name="criteria")
    op.drop_index(op.f("ix_criteria_code"), table_name="criteria")
    op.drop_table("criteria")
    op.drop_index("ix_ifc_files_project_id", table_name="ifc_files")
    op.drop_table("ifc_files")
    op.drop_table("criteria_sets")
    op.drop_table("projects")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
