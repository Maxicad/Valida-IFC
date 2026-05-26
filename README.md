# Valida IFC

Monorepo para uma aplicacao web de auditoria IFC BIM/openBIM.

## Direcao de produto

O Valida IFC deve transformar um IFC em evidencia de auditoria BIM: criterios importaveis, validacao automatica, pontuacao por criticidade, inconformidades por elemento no viewer 3D e relatorio tecnico pronto para entrega.

Escopo da Alfa:

- Criterios BIM por CSV/TXT/XLS/XLSX e IDS MVP.
- Pontuacao ponderada por criticidade.
- Relatorio tecnico com resumo executivo, detalhes e sugestoes de correcao.
- Visualizacao 3D com inconformidades por elemento/GlobalId.
- Fluxo leve para auditor BIM, sem depender de Solibri/Revit como runtime.

Escopo pos-Alfa/Beta:

- BCF.
- IDS ampliado e possivel exportacao IDS.
- API publica.
- Empacotamento self-host.

Mapa detalhado: `docs/PRODUCT_SCOPE_PHASE_MAPPING.md`.

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

Por padrao, o PostgreSQL local e publicado em `5433` e o Redis em `6380`, para evitar conflito com outros projetos. A API usa os nomes internos `postgres:5432` e `redis:6379` dentro do Compose.

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
