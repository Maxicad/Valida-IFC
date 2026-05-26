# Backend

Stack:

- FastAPI.
- Pydantic.
- SQLAlchemy.
- PostgreSQL.
- JWT.
- IfcOpenShell/web-ifc adapters conforme o fluxo de leitura IFC, viewer e auditoria.

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
- Importacao de criterios aceita CSV, TXT, XLS, XLSX e IDS/XML MVP com validacao por linha/campo.
- Auditoria avalia regras contra o IFC salvo e persiste `audit_runs` e `audit_results`, incluindo detalhe por elemento/GlobalId quando aplicavel.
- O score deve usar criticidade ponderada e permanecer explicavel no resultado e no relatorio.
- Leitura de schema usa o cabecalho `FILE_SCHEMA`.
- Alembic controla a criacao e evolucao do schema.

## Escopo futuro

- BCF, IDS ampliado, API publica e self-host pertencem a Phase 10/Beta, nao ao gate de producao da Alfa.
