# Backend

Stack:

- FastAPI.
- Pydantic.
- SQLAlchemy.
- PostgreSQL.
- JWT.
- IfcOpenShell em fase futura para leitura IFC completa.

## Modulos

- `auth`
- `projects`
- `files`
- `criteria`
- `audits`
- `reports`
- `core`

## Decisoes

- Rotas ja seguem o contrato do produto.
- Upload IFC valida extensao e tamanho.
- Leitura de schema usa o cabecalho `FILE_SCHEMA`.
- Persistencia real sera ligada na etapa de backend base com migrations.
