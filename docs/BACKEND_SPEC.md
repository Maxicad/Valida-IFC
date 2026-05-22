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
- `users`
- `projects`
- `files`
- `criteria`
- `audits`
- `reports`
- `core`

## Decisoes

- Rotas ja seguem o contrato do produto.
- Autenticacao usa senha com hash, login com JWT e protecao Bearer nas rotas internas.
- CRUD de usuarios, projetos, conjuntos de criterios, criterios e arquivos IFC usa SQLAlchemy.
- Upload IFC valida extensao e tamanho, salva em storage local e registra metadados no banco.
- Importacao de criterios aceita CSV, TXT, XLS e XLSX com validacao por linha.
- Auditoria inicial avalia regras basicas contra o IFC salvo e persiste `audit_runs` e `audit_results`.
- Leitura de schema usa o cabecalho `FILE_SCHEMA`.
- Alembic controla a criacao e evolucao do schema.
