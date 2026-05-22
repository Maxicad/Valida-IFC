def validate_property_not_empty(value: object) -> bool:
    return value is not None and str(value).strip() != ""
