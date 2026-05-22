from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ifc_utils.ifc_reader import read_ifc_schema_from_text

try:  # pragma: no cover - optional runtime dependency
    import ifcopenshell  # type: ignore
    import ifcopenshell.util.element as ifc_element_utils  # type: ignore
except Exception:  # pragma: no cover - fallback path when IfcOpenShell is unavailable
    ifcopenshell = None
    ifc_element_utils = None


@dataclass(frozen=True)
class IfcElementRef:
    guid: str | None
    entity: str
    name: str | None
    raw: Any
    fallback_args: list[str] | None = None


class IfcAuditContext:
    def __init__(self, file_path: str, schema_hint: str | None = None) -> None:
        self.file_path = file_path
        self._text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        self.schema = schema_hint or read_ifc_schema_from_text(self._text)
        self._ifc_model = self._open_ifc_model(file_path)
        self._cache: dict[str, list[IfcElementRef]] = {}

    @property
    def has_ifcopenshell(self) -> bool:
        return self._ifc_model is not None

    def list_elements(self, entity_ifc: str | None) -> list[IfcElementRef]:
        key = (entity_ifc or "__all__").upper()
        if key in self._cache:
            return self._cache[key]

        if self._ifc_model is not None:
            elements = self._list_elements_with_ifcopenshell(entity_ifc)
        else:
            elements = self._list_elements_from_text(entity_ifc)

        self._cache[key] = elements
        return elements

    def count_entities(self, entity_ifc: str | None) -> int:
        return len(self.list_elements(entity_ifc))

    def duplicate_global_ids(self, entity_ifc: str | None = None) -> dict[str, list[IfcElementRef]]:
        duplicated: dict[str, list[IfcElementRef]] = {}
        for element in self.list_elements(entity_ifc):
            if not element.guid:
                continue
            duplicated.setdefault(element.guid, []).append(element)
        return {guid: rows for guid, rows in duplicated.items() if len(rows) > 1}

    def get_property_value(self, element: IfcElementRef, property_name: str | None) -> str | None:
        if not property_name:
            return None

        if self._ifc_model is not None:
            value = _get_property_with_ifcopenshell(element.raw, property_name)
            return normalize_ifc_value(value)

        index = property_attribute_index(property_name)
        if index is None or not element.fallback_args or len(element.fallback_args) <= index:
            return None
        return normalize_ifc_value(element.fallback_args[index])

    def _list_elements_with_ifcopenshell(self, entity_ifc: str | None) -> list[IfcElementRef]:
        if self._ifc_model is None:
            return []

        if entity_ifc:
            entities = list(self._ifc_model.by_type(entity_ifc))
        else:
            entities = list(self._ifc_model.by_type("IfcRoot"))

        rows: list[IfcElementRef] = []
        for entity in entities:
            guid = normalize_ifc_value(getattr(entity, "GlobalId", None))
            name = normalize_ifc_value(getattr(entity, "Name", None))
            rows.append(
                IfcElementRef(
                    guid=guid or None,
                    entity=entity.is_a(),
                    name=name or None,
                    raw=entity,
                )
            )
        return rows

    def _list_elements_from_text(self, entity_ifc: str | None) -> list[IfcElementRef]:
        normalized_entity = (entity_ifc or "").strip().lower()
        if not normalized_entity or normalized_entity == "ifcproduct":
            pattern = re.compile(
                r"#\d+\s*=\s*(IFC[A-Z0-9_]+)\s*\((.*?)\)\s*;",
                re.IGNORECASE | re.DOTALL,
            )
            return self._parse_rows_from_pattern(pattern, entity_name_index=1, args_index=2)

        pattern = re.compile(rf"#\d+\s*=\s*({re.escape(entity_ifc)})\s*\((.*?)\)\s*;", re.IGNORECASE | re.DOTALL)
        return self._parse_rows_from_pattern(pattern, entity_name_index=1, args_index=2)

    def _parse_rows_from_pattern(
        self,
        pattern: re.Pattern[str],
        entity_name_index: int,
        args_index: int,
    ) -> list[IfcElementRef]:
        rows: list[IfcElementRef] = []
        for match in pattern.finditer(self._text):
            entity_name = match.group(entity_name_index)
            args = split_ifc_args(match.group(args_index))
            guid = normalize_ifc_value(args[0]) if args else None
            name = normalize_ifc_value(args[2]) if len(args) > 2 else None
            rows.append(
                IfcElementRef(
                    guid=guid or None,
                    entity=entity_name,
                    name=name or None,
                    raw=match.group(0),
                    fallback_args=args,
                )
            )
        return rows

    @staticmethod
    def _open_ifc_model(file_path: str) -> Any | None:
        if ifcopenshell is None:
            return None
        try:
            return ifcopenshell.open(file_path)
        except Exception:
            return None


def _get_property_with_ifcopenshell(entity: Any, property_name: str) -> Any:
    normalized = property_name.strip()
    if "." in normalized and ifc_element_utils is not None:
        pset_name, prop_name = normalized.split(".", 1)
        try:
            return ifc_element_utils.get_pset(entity, pset_name, prop_name)
        except Exception:
            return None

    # 1) Direct IFC attribute (e.g. Name, Description, ObjectType, Tag)
    value = _get_attribute_value(entity, normalized)
    if value is not None:
        return value

    # 2) First matching property name from any pset (case-insensitive)
    if ifc_element_utils is not None:
        try:
            psets = ifc_element_utils.get_psets(entity)
        except Exception:
            psets = {}
        needle = normalized.lower()
        for pset_values in psets.values():
            if not isinstance(pset_values, dict):
                continue
            for key, candidate_value in pset_values.items():
                if str(key).lower() == needle:
                    return candidate_value
    return None


def _get_attribute_value(entity: Any, attribute_name: str) -> Any:
    try:
        available = list(entity.get_info().keys())
    except Exception:
        available = []

    target_lower = attribute_name.lower()
    for field in available:
        if str(field).lower() == target_lower:
            try:
                return getattr(entity, field)
            except Exception:
                return None
    return None


def split_ifc_args(raw_args: str) -> list[str]:
    args: list[str] = []
    current: list[str] = []
    depth = 0
    in_string = False
    index = 0
    while index < len(raw_args):
        char = raw_args[index]
        if char == "'":
            in_string = not in_string
            current.append(char)
        elif not in_string and char == "(":
            depth += 1
            current.append(char)
        elif not in_string and char == ")":
            depth -= 1
            current.append(char)
        elif not in_string and depth == 0 and char == ",":
            args.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        index += 1
    args.append("".join(current).strip())
    return args


def property_attribute_index(property_name: str | None) -> int | None:
    if not property_name:
        return None
    normalized = property_name.strip().lower()
    return {
        "globalid": 0,
        "name": 2,
        "description": 3,
        "objecttype": 4,
        "tag": 7,
    }.get(normalized)


def normalize_ifc_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return ", ".join(normalize_ifc_value(item) for item in value)
    if isinstance(value, dict):
        return ", ".join(f"{key}={normalize_ifc_value(val)}" for key, val in value.items())
    string_value = str(value).strip()
    if string_value.startswith("'") and string_value.endswith("'"):
        return string_value[1:-1].strip()
    return string_value
