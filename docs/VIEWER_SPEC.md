# Visualizador IFC

Objetivo: abrir o modelo IFC no navegador, selecionar elementos e aplicar cores por resultado de auditoria.

## Cores

- Verde: aprovado.
- Vermelho: reprovado em criticidade alta.
- Laranja: reprovado em criticidade moderada.
- Amarelo: reprovado em criticidade baixa.
- Cinza: nao avaliado.
- Azul: selecionado.

## Contrato esperado

O viewer deve consumir `/ifc-files/{id}/viewer-data` e mapear resultados por `GlobalId`.

## Loader real no navegador

- O frontend tenta carregar o IFC bruto por `/ifc-files/{id}/download` e processar a geometria com `web-ifc` no browser.
- O WASM do loader fica exposto em `/web-ifc/web-ifc.wasm`.
- A geometria extraida no browser preserva `GlobalId`, `express_id`, tipo IFC, vertices e indices.
- Se o loader browser falhar ou retornar geometria vazia, o viewer usa o endpoint backend `/ifc-files/{id}/viewer-geometry` como fallback.
- O painel do viewer mostra origem do loader, tempo de carregamento, triangulos e heap quando o navegador disponibiliza essa metrica.

## Performance e modelos maiores

- A montagem das malhas no canvas e feita em lotes para ceder frames ao navegador e reduzir travamentos perceptiveis ao trocar filtros ou arquivo.
- Mudancas de filtros/modelo cancelam a renderizacao anterior antes de adicionar novas malhas, evitando trabalho obsoleto no canvas.
- O renderer usa `powerPreference: high-performance`, pixel ratio controlado, material tecnico sem iluminacao e render sob demanda para reduzir custo de GPU.
- Modelos grandes usam orcamento interativo de canvas por triangulos/elementos; a inspecao precisa continua por GlobalId, codigo, severidade e status.
- O painel mostra contagem de elementos renderizados e tempo de montagem no canvas.
- Modelos acima do limite interno de triangulos exibem aviso de volume, mantendo a Fase 5 em observacao ate haver evidencia com IFC medio/grande real.

## Evidencia real - 2026-05-23

- Dataset: `G:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM`.
- Modelo testado: `SALE-ELE-PB-0000-EMBA-MODE-R02.ifc` (85.08 MB).
- Loader browser `web-ifc`: 2.072.009 triangulos extraidos.
- Heap usado apos load/orbit/filtros: aproximadamente 289.9 MB.
- FPS medido apos carregamento: idle 60 FPS, orbit 60 FPS, filtros 60 FPS, sem long frames >50 ms.
- GlobalId, codigo de criterio e lista clicavel validados com falha sintetica `PERF-GID-001`.
- Evidencias: `docs/evidence/phase5-real-ifc-2026-05-23/RESULTS.md`.
