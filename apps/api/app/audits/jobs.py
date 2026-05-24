from app.audits.service import execute_audit_run_by_id, mark_audit_run_failed
from app.core.database import SessionLocal


def process_audit_run(audit_run_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        execute_audit_run_by_id(db, audit_run_id)
        db.commit()
        return {"audit_run_id": audit_run_id, "status": "completed"}
    except Exception as exc:
        mark_audit_run_failed(db, audit_run_id, str(exc))
        db.commit()
        raise
    finally:
        db.close()
