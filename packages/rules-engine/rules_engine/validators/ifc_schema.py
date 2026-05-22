def validate_ifc_schema(actual_schema: str | None, allowed: list[str]) -> bool:
    return actual_schema in allowed
