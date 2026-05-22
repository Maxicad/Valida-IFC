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

## Proxima fase

- Escolher web-ifc ou That Open Components.
- Carregar arquivo IFC real.
- Sincronizar painel de propriedades, tabela de inconformidades e selecao 3D.
