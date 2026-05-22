# Valida IFC API

FastAPI modular para autenticacao, projetos, arquivos IFC, criterios, auditorias e relatorios.

## Executar com Docker

```powershell
docker compose up --build api
```

## Migrations

Aplicar migrations no banco configurado em `DATABASE_URL`:

```powershell
docker compose run --rm api alembic -c apps/api/alembic.ini upgrade head
```

Se estiver usando o Compose do projeto, o PostgreSQL e publicado no host em `5433`, mas a API acessa o banco pela rede interna em `postgres:5432`.

Criar uma nova revision depois de alterar modelos SQLAlchemy:

```powershell
alembic -c apps/api/alembic.ini revision --autogenerate -m "descricao"
```

## Executar localmente

Requer Python 3.12 no PATH:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```
