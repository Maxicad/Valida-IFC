# Banco de Dados

O modelo inicial segue as entidades descritas no arquivo de estrutura.

## Tabelas

- `users`: usuarios, email, hash de senha e perfil.
- `projects`: dados do projeto, cliente, disciplina, fase e status.
- `ifc_files`: arquivo IFC, caminho no storage, tamanho, schema e metadados.
- `criteria_sets`: conjuntos de criterios importados ou manuais.
- `criteria`: regras individuais com criticidade e campos IFC.
- `audit_runs`: execucoes de auditoria e pontuacao consolidada.
- `audit_results`: resultado por criterio e, quando houver, por elemento IFC.
- `reports`: relatorios gerados.

## Proxima fase

- Ligar as rotas aos repositorios SQLAlchemy.
- Substituir stubs das rotas por repositorios SQLAlchemy.
- Definir indices para `project_id`, `ifc_file_id`, `criteria_set_id` e `element_guid`.

## Migrations

As migrations ficam em `apps/api/migrations`.

Aplicar a partir da raiz do monorepo:

```powershell
docker compose run --rm api alembic -c apps/api/alembic.ini upgrade head
```

O Compose publica o PostgreSQL no host em `5433` por padrao. Dentro da rede Docker, a URL continua usando `postgres:5432`.

Gerar nova revision depois de alterar os modelos:

```powershell
alembic -c apps/api/alembic.ini revision --autogenerate -m "descricao"
```
