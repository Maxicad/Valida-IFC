from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, Criterion, IfcFile, Project

router = APIRouter(tags=["reports"])


@router.get("/audits/{audit_id}/report/html", response_class=Response)
def get_report_html(audit_id: str, db: Session = Depends(get_db)) -> Response:
    payload = build_report_payload(db, audit_id)
    rows = "".join(
        f"""
        <tr>
          <td>{item['code']}</td>
          <td>{item['status']}</td>
          <td>{item['severity']}</td>
          <td>{item['element_guid'] or '-'}</td>
          <td>{item['message']}</td>
          <td>{item['fix_suggestion'] or '-'}</td>
        </tr>
        """
        for item in payload["failed_rows"]
    )

    html = f"""
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatorio {audit_id}</title>
        <style>
          body {{ font-family: Arial, sans-serif; margin: 24px; color: #23262a; }}
          h1, h2 {{ margin: 0 0 12px; }}
          .meta {{ margin-bottom: 16px; }}
          .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }}
          .card {{ border: 1px solid #d7dde3; border-radius: 8px; padding: 10px; }}
          table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
          th, td {{ border: 1px solid #d7dde3; padding: 8px; text-align: left; vertical-align: top; }}
          th {{ background: #f1f4f7; }}
          .actions a {{ margin-right: 8px; }}
        </style>
      </head>
      <body>
        <h1>Relatorio de Auditoria IFC</h1>
        <div class="meta">
          <strong>Auditoria:</strong> {payload['audit_id']}<br/>
          <strong>Projeto:</strong> {payload['project_name']}<br/>
          <strong>Arquivo IFC:</strong> {payload['ifc_file_name']}<br/>
          <strong>Data:</strong> {payload['generated_at']}
        </div>

        <div class="grid">
          <div class="card"><strong>Score</strong><br/>{payload['score_percent']}%</div>
          <div class="card"><strong>Total</strong><br/>{payload['total_criteria']}</div>
          <div class="card"><strong>Aprovados</strong><br/>{payload['approved_criteria']}</div>
          <div class="card"><strong>Reprovados</strong><br/>{payload['failed_criteria']}</div>
        </div>

        <div class="actions">
          <a href="/ifc-files/{payload['ifc_file_id']}/viewer-data">Abrir viewer-data</a>
          <a href="/visualizador?ifc_file_id={payload['ifc_file_id']}">Abrir visualizador</a>
          <button onclick="window.print()">Imprimir</button>
        </div>

        <h2>Falhas por elemento</h2>
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Status</th>
              <th>Criticidade</th>
              <th>GlobalId</th>
              <th>Mensagem</th>
              <th>Sugestao</th>
            </tr>
          </thead>
          <tbody>
            {rows or '<tr><td colspan="6">Nenhuma falha encontrada.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
    """
    return Response(content=html, media_type="text/html")


@router.get("/audits/{audit_id}/report/pdf")
def get_report_pdf(audit_id: str, db: Session = Depends(get_db)) -> StreamingResponse:
    payload = build_report_payload(db, audit_id)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 20 * mm

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, "Relatorio de Auditoria IFC")
    y -= 10 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Auditoria: {payload['audit_id']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Projeto: {payload['project_name']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Arquivo: {payload['ifc_file_name']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Score: {payload['score_percent']}%")
    y -= 8 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Falhas")
    y -= 6 * mm
    pdf.setFont("Helvetica", 9)

    if not payload["failed_rows"]:
        pdf.drawString(20 * mm, y, "Nenhuma falha encontrada.")
    else:
        for row in payload["failed_rows"][:80]:
            line = (
                f"{row['code']} | {row['severity']} | {row['element_guid'] or '-'} | "
                f"{truncate(row['message'], 70)}"
            )
            pdf.drawString(20 * mm, y, line)
            y -= 5 * mm
            if y < 20 * mm:
                pdf.showPage()
                pdf.setFont("Helvetica", 9)
                y = height - 20 * mm

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="audit_{audit_id}.pdf"'},
    )


@router.get("/audits/{audit_id}/export/csv")
def export_csv(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "planned", "format": "csv"}


@router.get("/audits/{audit_id}/export/xlsx")
def export_xlsx(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "planned", "format": "xlsx"}


def build_report_payload(db: Session, audit_id: str) -> dict:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")

    project = db.get(Project, audit_run.project_id)
    ifc_file = db.get(IfcFile, audit_run.ifc_file_id)

    rows = db.execute(
        select(AuditResult, Criterion.code)
        .join(Criterion, Criterion.id == AuditResult.criteria_id)
        .where(
            AuditResult.audit_run_id == audit_id,
            AuditResult.is_summary.is_(False),
        )
        .order_by(AuditResult.created_at.asc())
    ).all()

    failed_rows = [
        {
            "code": code,
            "status": result.status,
            "severity": result.severity,
            "element_guid": result.element_guid,
            "message": result.message or "",
            "fix_suggestion": result.fix_suggestion,
        }
        for result, code in rows
        if result.status == "failed"
    ]

    return {
        "audit_id": audit_id,
        "ifc_file_id": audit_run.ifc_file_id,
        "project_name": project.name if project else audit_run.project_id,
        "ifc_file_name": ifc_file.file_name if ifc_file else audit_run.ifc_file_id,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "score_percent": audit_run.score_percent or 0,
        "total_criteria": audit_run.total_criteria,
        "approved_criteria": audit_run.approved_criteria,
        "failed_criteria": audit_run.failed_criteria,
        "failed_rows": failed_rows,
    }


def truncate(value: str, size: int) -> str:
    return value if len(value) <= size else value[: size - 3] + "..."
