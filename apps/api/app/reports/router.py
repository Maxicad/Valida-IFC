from datetime import datetime
from hashlib import sha256
from html import escape
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, AuditSnapshot, Criterion, IfcFile, Project

router = APIRouter(tags=["reports"])


@router.get("/audits/{audit_id}/report/html", response_class=Response)
def get_report_html(audit_id: str, db: Session = Depends(get_db)) -> Response:
    payload = build_report_payload(db, audit_id)
    return render_report_html(payload)


@router.get("/snapshots/{token}", response_class=Response)
def get_snapshot_html(token: str, db: Session = Depends(get_db)) -> Response:
    snapshot = resolve_snapshot(db, token)
    payload = build_report_payload(db, snapshot.audit_run_id)
    failed_items = "".join(
        f"""
        <li>
          <strong>{escape(item['code'])}</strong>
          <span>{escape(item['element_guid'] or '-')}</span>
          <span>{escape(item['message'])}</span>
        </li>
        """
        for item in payload["failed_rows"][:8]
    )
    html = f"""
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Snapshot {escape(payload['audit_id'])}</title>
        <style>
          :root {{ color-scheme: light; --ink: #17201b; --muted: #5b665f; --line: #d9ded6; --panel: #ffffff; --surface: #f6f7f4; --moss: #5a6f54; --coral: #b95f4b; --steel: #4d6a7a; }}
          body {{ margin: 0; background: var(--surface); color: var(--ink); font-family: Arial, sans-serif; }}
          main {{ max-width: 920px; margin: 0 auto; padding: 24px; }}
          section {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 22px; }}
          h1, h2, p {{ margin-top: 0; }}
          h1 {{ margin-bottom: 8px; font-size: 28px; }}
          .muted {{ color: var(--muted); font-size: 13px; line-height: 1.5; }}
          .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }}
          .metric {{ border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfcfb; }}
          .metric span {{ display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }}
          .metric strong {{ display: block; margin-top: 8px; font-size: 26px; }}
          .actions {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }}
          a {{ border: 1px solid var(--line); border-radius: 6px; color: var(--ink); padding: 8px 10px; text-decoration: none; }}
          ul {{ margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }}
          li {{ display: grid; gap: 8px; grid-template-columns: 130px 150px 1fr; border-bottom: 1px solid var(--line); padding: 10px; font-size: 13px; }}
          li:last-child {{ border-bottom: 0; }}
          @media (max-width: 720px) {{ .grid, li {{ grid-template-columns: 1fr; }} }}
        </style>
      </head>
      <body>
        <main>
          <section>
            <p class="muted">Snapshot read-only expira em {snapshot.expires_at.strftime("%Y-%m-%d %H:%M:%S")} UTC</p>
            <h1>{escape(payload['project_name'])}</h1>
            <p class="muted">
              Auditoria {escape(payload['audit_id'])} | Arquivo {escape(payload['ifc_file_name'])}
            </p>
            <div class="grid">
              <div class="metric"><span>Score</span><strong>{payload['score_percent']}%</strong></div>
              <div class="metric"><span>Criterios</span><strong>{payload['total_criteria']}</strong></div>
              <div class="metric"><span>Aprovados</span><strong>{payload['approved_criteria']}</strong></div>
              <div class="metric"><span>Reprovados</span><strong>{payload['failed_criteria']}</strong></div>
            </div>
            <h2>Falhas principais</h2>
            <ul>{failed_items or '<li><strong>OK</strong><span>-</span><span>Nenhuma falha encontrada.</span></li>'}</ul>
            <div class="actions">
              <a href="/snapshots/{escape(token)}/report/html">Abrir relatorio HTML</a>
            </div>
          </section>
        </main>
      </body>
    </html>
    """
    return Response(content=html, media_type="text/html")


@router.get("/snapshots/{token}/report/html", response_class=Response)
def get_snapshot_report_html(token: str, db: Session = Depends(get_db)) -> Response:
    snapshot = resolve_snapshot(db, token)
    return render_report_html(build_report_payload(db, snapshot.audit_run_id))


def render_report_html(payload: dict) -> Response:
    decision = report_decision(payload)
    action_items = recommended_actions(payload)
    rows = "".join(
        f"""
        <tr>
          <td>{escape(item['code'])}</td>
          <td>{escape(item['severity'])}</td>
          <td>{escape(item['element_guid'] or '-')}</td>
          <td>{escape(item['message'])}</td>
          <td>{escape(item['fix_suggestion'] or '-')}</td>
        </tr>
        """
        for item in payload["failed_rows"]
    )
    actions = "".join(f"<li>{escape(item)}</li>" for item in action_items)

    html = f"""
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatorio {escape(payload['audit_id'])}</title>
        <style>
          :root {{ color-scheme: light; --ink: #17201b; --muted: #5b665f; --line: #d9ded6; --panel: #ffffff; --surface: #f6f7f4; --ok: #5a6f54; --risk: #b95f4b; --steel: #4d6a7a; }}
          body {{ margin: 0; background: var(--surface); color: var(--ink); font-family: Arial, sans-serif; }}
          main {{ max-width: 960px; margin: 0 auto; padding: 24px; }}
          h1, h2, h3, p {{ margin-top: 0; }}
          h1 {{ margin-bottom: 8px; font-size: 28px; }}
          h2 {{ margin-bottom: 12px; font-size: 18px; }}
          h3 {{ margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }}
          .sheet {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 22px; }}
          .muted {{ color: var(--muted); font-size: 13px; line-height: 1.5; }}
          .decision {{ margin: 18px 0; border: 1px solid var(--line); border-left: 6px solid {decision['color']}; border-radius: 8px; padding: 14px 16px; background: #fbfcfb; }}
          .decision strong {{ display: block; margin-bottom: 6px; font-size: 20px; }}
          .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }}
          .card {{ border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfcfb; }}
          .card span {{ display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }}
          .card strong {{ display: block; margin-top: 8px; font-size: 26px; }}
          .actions {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }}
          .actions a, .actions button {{ border: 1px solid var(--line); border-radius: 6px; background: var(--panel); color: var(--ink); padding: 8px 10px; font: inherit; font-size: 13px; text-decoration: none; }}
          .summary {{ display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }}
          .box {{ border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfb; }}
          ol, ul {{ margin: 0; padding-left: 20px; }}
          li {{ margin: 6px 0; }}
          table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
          th, td {{ border: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }}
          th {{ background: #eef3f1; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }}
          .details {{ margin-top: 22px; }}
          @media print {{
            body {{ background: #fff; }}
            main {{ max-width: none; padding: 0; }}
            .sheet {{ border: 0; border-radius: 0; padding: 0; }}
            .actions {{ display: none; }}
            .details {{ break-before: page; }}
            table {{ page-break-inside: auto; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
          }}
        </style>
      </head>
      <body>
        <main>
          <section class="sheet">
            <h1>Relatorio de Auditoria IFC</h1>
            <p class="muted">
              Projeto: <strong>{escape(payload['project_name'])}</strong> |
              Arquivo IFC: <strong>{escape(payload['ifc_file_name'])}</strong> |
              Gerado em: {escape(payload['generated_at'])}
            </p>

            <section class="decision">
              <strong>{escape(decision['title'])}</strong>
              <span>{escape(decision['message'])}</span>
            </section>

            <div class="grid">
              <div class="card"><span>Score</span><strong>{payload['score_percent']}%</strong></div>
              <div class="card"><span>Criterios</span><strong>{payload['total_criteria']}</strong></div>
              <div class="card"><span>Aprovados</span><strong>{payload['approved_criteria']}</strong></div>
              <div class="card"><span>Reprovados</span><strong>{payload['failed_criteria']}</strong></div>
            </div>

            <div class="summary">
              <section class="box">
                <h2>Resumo executivo</h2>
                <p class="muted">{escape(executive_summary(payload))}</p>
              </section>
              <section class="box">
                <h2>Corrigir primeiro</h2>
                <ol>{actions or '<li>Nenhuma correcao pendente.</li>'}</ol>
              </section>
            </div>

            <div class="actions">
              <a href="/visualizador?ifc_file_id={escape(payload['ifc_file_id'])}">Abrir visualizador</a>
              <button onclick="window.print()">Imprimir</button>
            </div>

            <section class="details">
              <h2>Detalhes por elemento</h2>
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Criticidade</th>
                    <th>GlobalId</th>
                    <th>Mensagem</th>
                    <th>Sugestao</th>
                  </tr>
                </thead>
                <tbody>
                  {rows or '<tr><td colspan="5">Nenhuma falha encontrada.</td></tr>'}
                </tbody>
              </table>
            </section>
          </section>
        </main>
      </body>
    </html>
    """
    return Response(content=html, media_type="text/html")


@router.get("/audits/{audit_id}/report/pdf")
def get_report_pdf(audit_id: str, db: Session = Depends(get_db)) -> StreamingResponse:
    payload = build_report_payload(db, audit_id)
    decision = report_decision(payload)
    action_items = recommended_actions(payload)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 20 * mm

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, "Relatorio de Auditoria IFC")
    y -= 10 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Projeto: {payload['project_name']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Arquivo: {payload['ifc_file_name']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Gerado em: {payload['generated_at']}")
    y -= 6 * mm

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(20 * mm, y, "Resumo executivo")
    y -= 7 * mm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(20 * mm, y, decision["title"])
    y -= 6 * mm
    pdf.setFont("Helvetica", 10)
    for line in wrap_text(executive_summary(payload), 95):
        pdf.drawString(20 * mm, y, line)
        y -= 5 * mm
    y -= 3 * mm

    pdf.drawString(
        20 * mm,
        y,
        (
            f"Score: {payload['score_percent']}% | Total: {payload['total_criteria']} | "
            f"Aprovados: {payload['approved_criteria']} | Reprovados: {payload['failed_criteria']}"
        ),
    )
    y -= 9 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Corrigir primeiro")
    y -= 6 * mm
    pdf.setFont("Helvetica", 9)
    if action_items:
        for item in action_items:
            pdf.drawString(22 * mm, y, f"- {truncate(item, 105)}")
            y -= 5 * mm
    else:
        pdf.drawString(22 * mm, y, "Nenhuma correcao pendente.")
        y -= 5 * mm
    y -= 3 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Detalhes por elemento")
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


def resolve_snapshot(db: Session, token: str) -> AuditSnapshot:
    snapshot = db.scalar(select(AuditSnapshot).where(AuditSnapshot.token_hash == hash_snapshot_token(token)))
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Snapshot not found.")
    if snapshot.revoked_at is not None or snapshot.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=410, detail="Snapshot expired.")
    return snapshot


def hash_snapshot_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def truncate(value: str, size: int) -> str:
    return value if len(value) <= size else value[: size - 3] + "..."


def report_decision(payload: dict) -> dict[str, str]:
    if payload["failed_criteria"] == 0:
        return {
            "title": "Aprovado para prosseguir",
            "message": "Nenhum criterio reprovado foi encontrado nesta auditoria.",
            "color": "var(--ok)",
        }
    return {
        "title": "Revisao necessaria antes de aprovar",
        "message": "Existem criterios reprovados. Corrija os itens listados antes de usar este modelo como evidencia final.",
        "color": "var(--risk)",
    }


def executive_summary(payload: dict) -> str:
    if payload["failed_criteria"] == 0:
        return (
            f"O arquivo {payload['ifc_file_name']} atingiu {payload['score_percent']}% de conformidade "
            f"em {payload['total_criteria']} criterios avaliados."
        )
    return (
        f"O arquivo {payload['ifc_file_name']} atingiu {payload['score_percent']}% de conformidade. "
        f"Foram encontrados {payload['failed_criteria']} criterios reprovados, com "
        f"{len(payload['failed_rows'])} ocorrencias por elemento para revisar."
    )


def recommended_actions(payload: dict) -> list[str]:
    actions: list[str] = []
    seen: set[str] = set()
    for row in payload["failed_rows"]:
        suggestion = row["fix_suggestion"] or row["message"]
        key = f"{row['code']}:{suggestion}"
        if key in seen:
            continue
        seen.add(key)
        actions.append(f"{row['code']}: {suggestion}")
        if len(actions) == 3:
            break
    return actions


def wrap_text(value: str, size: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > size and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines
