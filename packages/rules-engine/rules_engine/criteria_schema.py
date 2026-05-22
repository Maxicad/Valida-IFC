from typing import Literal

from pydantic import BaseModel, Field, field_validator

from rules_engine.severity import normalize_severity

Severity = Literal["baixa", "moderada", "alta"]


class CriterionSchema(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    category: str | None = None
    severity: Severity
    rule_type: str = Field(min_length=1)
    entity_ifc: str | None = None
    property_name: str | None = None
    operator: str | None = None
    expected_value: str | list[str] | None = None
    failure_message: str | None = None
    fix_suggestion: str | None = None
    reference: str | None = None
    active: bool = True
    natural_language_source: str | None = None

    @field_validator("severity", mode="before")
    @classmethod
    def validate_severity(cls, value: str) -> str:
        return normalize_severity(value)
