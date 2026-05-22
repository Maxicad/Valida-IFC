# Arquitetura

O Valida IFC usa um monorepo com separacao entre interface, API, worker e pacotes de dominio.

```text
Usuario -> Frontend Next.js -> FastAPI -> Banco/Storage
                              -> Worker futuro -> Regras/IFC utils
```

## Camadas

- `apps/web`: interface web, navegacao, formularios e visualizacao dos resultados.
- `apps/api`: fonte confiavel para autenticacao, projetos, arquivos IFC, criterios e auditorias.
- `apps/worker`: processamento pesado futuro, como leitura completa do IFC e geracao de viewer-data.
- `packages/rules-engine`: regras, criticidade, calculo de score e validadores.
- `packages/ifc-utils`: leitura de cabecalho IFC e extracao futura de metadados.
- `packages/shared`: tipos e constantes consumidos pelo frontend.

## Decisoes do MVP

- Storage local via volume Docker.
- PostgreSQL e Redis no Compose.
- Rotas e modelos preparados, com persistencia completa prevista para a proxima fase.
- Auditorias pesadas devem ser movidas para o worker antes de producao.
