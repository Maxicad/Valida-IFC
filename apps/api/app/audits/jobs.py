from app.audits.service import execute_audit_run_by_id
from app.core.database import SessionLocal


def process_audit_run(audit_run_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        execute_audit_run_by_id(db, audit_run_id)
        db.commit()
        return {"audit_run_id": audit_run_id, "status": "completed"}
    except Exception:
        db.commit()
        raise
    finally:
        db.close()
