# Valida IFC

Monorepo para uma aplicacao web de auditoria IFC BIM/openBIM.

Este primeiro ciclo cria a base do produto:

- Frontend Next.js com TypeScript e Tailwind CSS.
- Backend FastAPI modular.
- Worker preparado para processamento futuro.
- Pacotes auxiliares para regras e leitura IFC.
- Docker Compose com PostgreSQL e Redis.
- Documentacao inicial do produto e da arquitetura.

## Estrutura

```text
apps/web        Frontend Next.js
apps/api        API FastAPI
apps/worker     Worker para auditorias futuras
packages        Tipos, regras e utilitarios compartilhados
docs            Documentacao tecnica
infra           Infraestrutura local
samples         Exemplos leves de criterios e relatorios
```

## Setup rapido

Ative o pnpm via Corepack:

```powershell
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

Suba a infraestrutura e a API via Docker:

```powershell
docker compose up --build
```

Frontend:

```powershell
pnpm dev
```

API:

```text
http://localhost:8000/docs
```

## Observacoes

- Arquivos IFC grandes nao devem ser versionados.
- A pasta `samples/ifc` deve receber apenas arquivos pequenos de teste.
- O backend sera a fonte confiavel dos resultados de auditoria.
- A auditoria pesada deve migrar para worker assincrono em producao.
