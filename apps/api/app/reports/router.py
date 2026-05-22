from fastapi import APIRouter, Response

router = APIRouter(tags=["reports"])


@router.get("/audits/{audit_id}/report/html", response_class=Response)
def get_report_html(audit_id: str) -> Response:
    html = f"""
    <!doctype html>
    <html lang="pt-BR">
      <head><meta charset="utf-8"><title>Relatorio {audit_id}</title></head>
      <body>
        <h1>Relatorio de Auditoria IFC</h1>
        <p>Auditoria: {audit_id}</p>
        <p>Percentual geral: 66.67%</p>
        <button onclick="window.print()">Imprimir</button>
      </body>
    </html>
    """
    return Response(content=html, media_type="text/html")


@router.get("/audits/{audit_id}/report/pdf")
def get_report_pdf(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "planned", "format": "pdf"}


@router.get("/audits/{audit_id}/export/csv")
def export_csv(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "planned", "format": "csv"}


@router.get("/audits/{audit_id}/export/xlsx")
def export_xlsx(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "planned", "format": "xlsx"}
