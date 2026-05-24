import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import pandas as pd
from pydantic import ValidationError

from app.criteria.schemas import CriterionCreate
from app.criteria.fix_guides import build_fix_suggestion

FIELD_ALIASES = {
    "codigo": "code",
    "code": "code",
    "nome": "name",
    "name": "name",
    "descricao": "description",
    "description": "description",
    "categoria": "category",
    "category": "category",
    "criticidade": "severity",
    "severity": "severity",
    "tipo_regra": "rule_type",
    "rule_type": "rule_type",
    "entidade_ifc": "entity_ifc",
    "entity_ifc": "entity_ifc",
    "propriedade": "property_name",
    "property": "property_name",
    "property_name": "property_name",
    "operador": "operator",
    "operator": "operator",
    "valor_esperado": "expected_value",
    "expected_value": "expected_value",
    "mensagem_reprovacao": "failure_message",
    "failure_message": "failure_message",
    "sugestao_correcao": "fix_suggestion",
    "fix_suggestion": "fix_suggestion",
    "referencia": "reference",
    "reference": "reference",
    "ativo": "active",
    "active": "active",
}

ALLOWED_RULE_TYPES = {
    "ifc_schema",
    "entity_exists",
    "entity_count_min",
    "property_exists",
    "property_not_empty",
    "property_value_equals",
    "property_value_in_list",
    "classification_exists",
    "unit_check",
    "spatial_structure_check",
    "globalid_unique",
    "geometry_exists",
}

ALLOWED_OPERATORS = {
    None,
    "",
    "in",
    "equals",
    "eq",
    "=",
    "not_empty",
    "exists",
    "min",
    ">=",
    "max",
    "<=",
}


class CriteriaImportValidationError(ValueError):
    pass


def parse_criteria_file(file_name: str, content: bytes) -> list[dict[str, Any]]:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".csv":
        return parse_csv(content)
    if suffix == ".txt":
        return parse_txt(content)
    if suffix in {".xlsx", ".xls"}:
        return parse_excel(content)
    if suffix in {".ids", ".xml"}:
        return parse_ids(content)
    raise CriteriaImportValidationError("Formato nao suportado. Envie CSV, TXT, XLS, XLSX, IDS ou XML.")


def parse_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    sample = text[:2048]
    dialect = csv.Sniffer().sniff(sample, delimiters=",;")
    reader = csv.DictReader(StringIO(text), dialect=dialect)
    return [dict(row) for row in reader]


def parse_txt(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    rows = [line.strip() for line in text.splitlines() if line.strip() and not line.strip().startswith("#")]
    if not rows:
        return []

    first_row = rows[0]
    delimiter = "|" if "|" in first_row else "," if "," in first_row else None
    if delimiter and any(alias in first_row.lower() for alias in FIELD_ALIASES):
        reader = csv.DictReader(StringIO("\n".join(rows)), delimiter=delimiter)
        return [dict(row) for row in reader]

    parsed_rows = []
    for row in rows:
        parts = [part.strip() for part in row.split("|")]
        if len(parts) < 4:
            parsed_rows.append({"_raw_error": "Linha TXT deve ter ao menos codigo | nome | criticidade | tipo_regra."})
            continue
        parsed_rows.append(
            {
                "code": parts[0],
                "name": parts[1],
                "severity": parts[2],
                "rule_type": parts[3],
                "entity_ifc": parts[4] if len(parts) > 4 else None,
                "property_name": parts[5] if len(parts) > 5 else None,
                "operator": parts[6] if len(parts) > 6 else None,
                "expected_value": parts[7] if len(parts) > 7 else None,
            }
        )
    return parsed_rows


def parse_excel(content: bytes) -> list[dict[str, Any]]:
    dataframe = pd.read_excel(BytesIO(content), dtype=str).fillna("")
    return dataframe.to_dict(orient="records")


def parse_ids(content: bytes) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise CriteriaImportValidationError(f"IDS/XML invalido: {exc}.") from exc

    specifications = [node for node in root.iter() if local_name(node.tag) == "specification"]
    if not specifications:
        raise CriteriaImportValidationError("IDS sem specification.")

    rows: list[dict[str, Any]] = []
    for index, specification in enumerate(specifications, start=1):
        entity_ifc = extract_ids_entity(specification)
        if not entity_ifc:
            rows.append(
                {
                    "code": f"IDS-{index:03d}",
                    "name": ids_spec_name(specification, index),
                    "severity": "alta",
                    "rule_type": "_invalid_ids",
                    "_raw_error": "IDS MVP exige uma entidade em applicability/entity/name.",
                }
            )
            continue

        properties = extract_ids_properties(specification)
        if not properties:
            rows.append(
                {
                    "code": f"IDS-{index:03d}-ENTITY",
                    "name": f"{ids_spec_name(specification, index)} - entidade presente",
                    "description": "Regra importada de IDS MVP.",
                    "category": "IDS",
                    "severity": "alta",
                    "rule_type": "entity_exists",
                    "entity_ifc": normalize_ids_entity(entity_ifc),
                    "operator": "exists",
                    "failure_message": f"Nenhuma instancia de {normalize_ids_entity(entity_ifc)} encontrada para o IDS.",
                    "reference": "IDS MVP",
                    "active": True,
                }
            )
            continue

        for property_index, property_node in enumerate(properties, start=1):
            property_name = extract_ids_property_name(property_node)
            if not property_name:
                rows.append(
                    {
                        "code": f"IDS-{index:03d}-{property_index:02d}",
                        "name": ids_spec_name(specification, index),
                        "severity": "alta",
                        "rule_type": "_invalid_ids",
                        "_raw_error": "IDS MVP exige property/name em cada requisito de propriedade.",
                    }
                )
                continue

            allowed_values = extract_ids_property_values(property_node)
            rule_type = "property_value_in_list" if allowed_values else "property_not_empty"
            rows.append(
                {
                    "code": f"IDS-{index:03d}-{property_index:02d}",
                    "name": f"{ids_spec_name(specification, index)} - {property_name}",
                    "description": "Regra importada de IDS MVP: entidade + propriedade requerida + valores permitidos quando informados.",
                    "category": "IDS",
                    "severity": "alta",
                    "rule_type": rule_type,
                    "entity_ifc": normalize_ids_entity(entity_ifc),
                    "property_name": property_name,
                    "operator": "in" if allowed_values else "not_empty",
                    "expected_value": "|".join(allowed_values) if allowed_values else None,
                    "failure_message": build_ids_failure_message(entity_ifc, property_name, allowed_values),
                    "fix_suggestion": build_fix_suggestion(
                        rule_type=rule_type,
                        entity_ifc=normalize_ids_entity(entity_ifc),
                        property_name=property_name,
                        expected_value="|".join(allowed_values) if allowed_values else None,
                    ),
                    "reference": "IDS MVP",
                    "active": True,
                }
            )
    return rows


def normalize_row(row: dict[str, Any], criteria_set_id: str) -> CriterionCreate:
    if raw_error := row.get("_raw_error"):
        raise CriteriaImportValidationError(str(raw_error))

    normalized: dict[str, Any] = {"criteria_set_id": criteria_set_id}
    for key, value in row.items():
        canonical_key = FIELD_ALIASES.get(str(key).strip().lower())
        if not canonical_key:
            continue
        normalized[canonical_key] = normalize_value(value)

    normalized["active"] = normalize_active(normalized.get("active", True))
    if normalized.get("severity"):
        normalized["severity"] = str(normalized["severity"]).strip().lower()
    if normalized.get("rule_type"):
        normalized["rule_type"] = str(normalized["rule_type"]).strip()
    if normalized.get("operator") is not None:
        normalized["operator"] = str(normalized["operator"]).strip() or None

    validate_rule_metadata(normalized)
    if not normalized.get("fix_suggestion"):
        normalized["fix_suggestion"] = build_fix_suggestion(
            rule_type=normalized.get("rule_type"),
            entity_ifc=normalized.get("entity_ifc"),
            property_name=normalized.get("property_name"),
            expected_value=normalized.get("expected_value"),
        )

    try:
        return CriterionCreate(**normalized)
    except ValidationError as exc:
        first_error = exc.errors()[0]
        field = ".".join(str(part) for part in first_error["loc"])
        raise CriteriaImportValidationError(f"Campo invalido '{field}': {first_error['msg']}") from exc


def normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value if value != "" else None
    return value


def normalize_active(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return True
    normalized = str(value).strip().lower()
    if normalized in {"sim", "s", "true", "1", "yes", "y", "ativo"}:
        return True
    if normalized in {"nao", "não", "n", "false", "0", "no", "inativo"}:
        return False
    raise CriteriaImportValidationError("Campo ativo deve ser sim/nao ou true/false.")


def validate_rule_metadata(row: dict[str, Any]) -> None:
    required_fields = ["code", "name", "severity", "rule_type"]
    missing = [field for field in required_fields if not row.get(field)]
    if missing:
        raise CriteriaImportValidationError(f"Campos obrigatorios ausentes: {', '.join(missing)}.")

    if row["rule_type"] not in ALLOWED_RULE_TYPES:
        raise CriteriaImportValidationError(f"Tipo de regra nao suportado: {row['rule_type']}.")

    operator = row.get("operator")
    if operator not in ALLOWED_OPERATORS:
        raise CriteriaImportValidationError(f"Operador nao suportado: {operator}.")

    if row["rule_type"] in {
        "entity_exists",
        "entity_count_min",
        "property_exists",
        "property_not_empty",
        "property_value_equals",
        "property_value_in_list",
        "geometry_exists",
    }:
        if not row.get("entity_ifc"):
            raise CriteriaImportValidationError("Regra exige entidade_ifc.")

    if row["rule_type"] in {
        "property_exists",
        "property_not_empty",
        "property_value_equals",
        "property_value_in_list",
    } and not row.get("property_name"):
        raise CriteriaImportValidationError("Regra exige propriedade.")

    if row["rule_type"] in {
        "ifc_schema",
        "entity_count_min",
        "property_value_equals",
        "property_value_in_list",
    } and not row.get("expected_value"):
        raise CriteriaImportValidationError("Regra exige valor_esperado.")


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def direct_children(node: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in list(node) if local_name(child.tag) == name]


def descendants(node: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in node.iter() if local_name(child.tag) == name]


def first_text(node: ET.Element | None) -> str | None:
    if node is None:
        return None
    simple_values = descendants(node, "simplevalue")
    if simple_values:
        value = (simple_values[0].text or "").strip()
        return value or None
    if "value" in node.attrib:
        return node.attrib["value"].strip() or None
    value = (node.text or "").strip()
    return value or None


def all_values(node: ET.Element | None) -> list[str]:
    if node is None:
        return []
    values: list[str] = []
    for simple_value in descendants(node, "simplevalue"):
        if simple_value.text and simple_value.text.strip():
            values.append(simple_value.text.strip())
    for enumeration in descendants(node, "enumeration"):
        value = enumeration.attrib.get("value")
        if value and value.strip():
            values.append(value.strip())
    if not values and node.text and node.text.strip():
        values.append(node.text.strip())
    return list(dict.fromkeys(values))


def ids_spec_name(specification: ET.Element, index: int) -> str:
    return specification.attrib.get("name") or specification.attrib.get("identifier") or f"IDS Specification {index}"


def extract_ids_entity(specification: ET.Element) -> str | None:
    applicability = next(iter(direct_children(specification, "applicability")), None)
    search_root = applicability if applicability is not None else specification
    entity = next(iter(descendants(search_root, "entity")), None)
    if entity is None:
        return None
    name_node = next(iter(direct_children(entity, "name")), None)
    return first_text(name_node) or first_text(entity)


def extract_ids_properties(specification: ET.Element) -> list[ET.Element]:
    requirements = direct_children(specification, "requirements")
    search_roots = requirements or [specification]
    properties: list[ET.Element] = []
    for search_root in search_roots:
        properties.extend(descendants(search_root, "property"))
    return properties


def extract_ids_property_name(property_node: ET.Element) -> str | None:
    name_node = next(iter(direct_children(property_node, "name")), None)
    return first_text(name_node)


def extract_ids_property_values(property_node: ET.Element) -> list[str]:
    value_node = next(iter(direct_children(property_node, "value")), None)
    return all_values(value_node)


def normalize_ids_entity(entity: str) -> str:
    stripped = entity.strip()
    known = {
        "IFCPROJECT": "IfcProject",
        "IFCSITE": "IfcSite",
        "IFCBUILDING": "IfcBuilding",
        "IFCBUILDINGSTOREY": "IfcBuildingStorey",
        "IFCSPACE": "IfcSpace",
        "IFCWALL": "IfcWall",
        "IFCWALLSTANDARDCASE": "IfcWallStandardCase",
        "IFCDOOR": "IfcDoor",
        "IFCWINDOW": "IfcWindow",
        "IFCSLAB": "IfcSlab",
        "IFCBEAM": "IfcBeam",
        "IFCCOLUMN": "IfcColumn",
        "IFCPRODUCT": "IfcProduct",
        "IFCELEMENT": "IfcElement",
    }
    return known.get(stripped.upper(), stripped)


def build_ids_failure_message(entity_ifc: str, property_name: str, allowed_values: list[str]) -> str:
    entity = normalize_ids_entity(entity_ifc)
    if allowed_values:
        return f"IDS exige {property_name} em {entity} com valor permitido: {', '.join(allowed_values)}."
    return f"IDS exige {property_name} preenchido em {entity}."
