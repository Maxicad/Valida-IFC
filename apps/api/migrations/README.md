# Alembic migrations

Comandos a partir da raiz do monorepo:

```powershell
alembic -c apps/api/alembic.ini upgrade head
alembic -c apps/api/alembic.ini revision --autogenerate -m "descricao"
```

Via Docker:

```powershell
docker compose run --rm api alembic -c apps/api/alembic.ini upgrade head
```
