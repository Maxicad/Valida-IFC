import pytest
from pydantic import ValidationError

from rules_engine.criteria_schema import CriterionSchema


def test_validates_minimal_criterion() -> None:
    criterion = CriterionSchema(
        code="IFC-001",
        name="Versao minima IFC",
        severity="alta",
        rule_type="ifc_schema",
        active=True,
    )

    assert criterion.severity == "alta"


def test_rejects_invalid_severity() -> None:
    with pytest.raises(ValidationError):
        CriterionSchema(
            code="IFC-001",
            name="Versao minima IFC",
            severity="critica",
            rule_type="ifc_schema",
            active=True,
        )
