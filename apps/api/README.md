# Valida IFC API

FastAPI modular para autenticacao, projetos, arquivos IFC, criterios, auditorias e relatorios.

## Executar com Docker

```powershell
docker compose up --build api
```

## Executar localmente

Requer Python 3.12 no PATH:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```
