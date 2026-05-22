from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.audits.router import router as audits_router
from app.core.config import settings
from app.criteria.router import router as criteria_router
from app.files.router import router as files_router
from app.projects.router import router as projects_router
from app.reports.router import router as reports_router


def create_app() -> FastAPI:
    api = FastAPI(
        title="Valida IFC API",
        description="API para auditoria BIM/openBIM de arquivos IFC.",
        version="0.1.0",
    )

    api.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "valida-ifc-api"}

    api.include_router(auth_router)
    api.include_router(projects_router)
    api.include_router(files_router)
    api.include_router(criteria_router)
    api.include_router(audits_router)
    api.include_router(reports_router)
    return api


app = create_app()
