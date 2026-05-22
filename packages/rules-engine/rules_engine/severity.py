SEVERITY_WEIGHTS = {
    "baixa": 1,
    "moderada": 3,
    "alta": 5,
}

SEVERITY_ALIASES = {
    "baixo": "baixa",
    "low": "baixa",
    "media": "moderada",
    "medio": "moderada",
    "moderado": "moderada",
    "moderate": "moderada",
    "high": "alta",
    "alto": "alta",
}


def normalize_severity(value: str) -> str:
    normalized = value.strip().lower()
    normalized = SEVERITY_ALIASES.get(normalized, normalized)
    if normalized not in SEVERITY_WEIGHTS:
        allowed = ", ".join(SEVERITY_WEIGHTS)
        raise ValueError(f"Invalid severity '{value}'. Allowed values: {allowed}.")
    return normalized


def severity_weight(value: str) -> int:
    return SEVERITY_WEIGHTS[normalize_severity(value)]
