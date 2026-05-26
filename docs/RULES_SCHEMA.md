# Schema de Regras

Campos canonicos:

```json
{
  "code": "IFC-001",
  "name": "Versao minima IFC",
  "description": "O arquivo deve estar em IFC4 ou IFC4X3.",
  "category": "Metadados",
  "severity": "alta",
  "rule_type": "ifc_schema",
  "entity_ifc": null,
  "property_name": "FILE_SCHEMA",
  "operator": "in",
  "expected_value": "IFC4|IFC4X3",
  "failure_message": "O arquivo IFC nao esta na versao minima exigida.",
  "fix_suggestion": "Exportar novamente em IFC4 ou IFC4X3.",
  "reference": "openBIM",
  "active": true
}
```

## Criticidade

- `baixa`: peso 1.
- `moderada`: peso 3.
- `alta`: peso 5.

O score da Alfa deve ser ponderado por esses pesos e mostrado de forma rastreavel no resultado da auditoria e no relatorio tecnico.

## Regras iniciais

- `ifc_schema`
- `entity_exists`
- `entity_count_min`
- `property_exists`
- `property_not_empty`
- `property_value_equals`
- `property_value_in_list`
- `classification_exists`
- `unit_check`
- `spatial_structure_check`
- `globalid_unique`
- `geometry_exists`

## Entradas de criterios

- Alfa: CSV, TXT, XLS, XLSX e IDS/XML MVP para casos comuns.
- Beta/pos-Alfa: IDS ampliado e exportacao de criterios como IDS quando houver correspondencia semantica segura.
