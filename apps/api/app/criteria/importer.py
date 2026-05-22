import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

import pandas as pd
from pydantic import ValidationError

from app.criteria.schemas import CriterionCreate

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
    raise CriteriaImportValidationError("Formato nao suportado. Envie CSV, TXT, XLS ou XLSX.")


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

    if row["rule_type"] in {"entity_exists", "entity_count_min", "property_exists", "property_not_empty"}:
        if not row.get("entity_ifc"):
            raise CriteriaImportValidationError("Regra exige entidade_ifc.")

    if row["rule_type"] in {"property_exists", "property_not_empty"} and not row.get("property_name"):
        raise CriteriaImportValidationError("Regra exige propriedade.")

    if row["rule_type"] in {"ifc_schema", "entity_count_min"} and not row.get("expected_value"):
        raise CriteriaImportValidationError("Regra exige valor_esperado.")
