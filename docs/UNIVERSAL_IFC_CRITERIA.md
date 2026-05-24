# Criterios Universais IFC

Last update: 2026-05-24
Owner: BIM + Product
Status: Initial list with 5 always-on checks.

## Objetivo

Estes criterios devem ser verificados em todo IFC recebido, independentemente da disciplina, fase ou origem do modelo. Eles formam o gate minimo antes de qualquer auditoria especifica de arquitetura, estrutura, instalacoes ou compatibilizacao.

## Lista inicial

| Codigo | Criterio universal | O que verificar | Motivo | Status tecnico |
| --- | --- | --- | --- | --- |
| UNI-IFC-001 | Versao IFC identificada e aceita | `FILE_SCHEMA` deve existir e estar em uma lista permitida, inicialmente `IFC2X3`, `IFC4` ou `IFC4X3`. | Sem schema confiavel, o parsing, as regras e o viewer ficam instaveis. | Suportado hoje por `ifc_schema`. |
| UNI-IFC-002 | Base de exportacao identificada | Header `FILE_NAME` deve indicar aplicacao/origem de exportacao, como Revit, Archicad, Tekla, Civil 3D ou outro emissor. | Ajuda a rastrear responsabilidade, configurar correcoes e comparar diferencas entre exportadores. | Requer nova regra de header/exportador. |
| UNI-IFC-003 | Coordenadas/georreferenciamento definidos | O arquivo deve conter `IfcSite` com referencia de localizacao/coordenadas ou estrutura equivalente aprovada no BEP. | Evita modelos deslocados, federacao ruim e problemas de coordenacao entre disciplinas. | Parcialmente suportado via `entity_exists` + propriedades de `IfcSite`; regra dedicada recomendada. |
| UNI-IFC-004 | Nome do projeto preenchido | `IfcProject.Name` deve estar preenchido e reconhecivel. | Garante rastreabilidade minima em relatorios, snapshots e historico de auditoria. | Suportado hoje por `property_not_empty`. |
| UNI-IFC-005 | Data de geracao identificada | Header `FILE_NAME` deve conter data/hora de geracao/exportacao do IFC. | Permite controlar revisoes, validade do arquivo e ordem de entregas. | Requer nova regra de header/data. |

## Observacoes

- Disciplina tambem deve entrar no gate universal, mas fica como proximo criterio (`UNI-IFC-006`) porque pode vir do nome do arquivo, metadado do projeto, `IfcProject`, `IfcDocumentInformation` ou convencao interna.
- Para producao, o ideal e separar estes checks em dois grupos:
  - checks IFC nativos: schema, `IfcProject`, `IfcSite`, coordenadas;
  - checks de governanca/header: origem de exportacao, data de geracao, disciplina e convencao de nome.
- A lista importavel atual esta em `samples/criteria/criterios_universais.csv` e contem apenas validacoes compativeis com o motor atual.
