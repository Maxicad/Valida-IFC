from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class RuleResult:
    status: str
    severity: str
    message: str
    actual_value: str | None = None
    expected_value: str | None = None
    element_guid: str | None = None
    element_type: str | None = None


Evaluator = Callable[[object, dict, object], RuleResult]


def get_evaluator(rule_type: str) -> Evaluator:
    def placeholder(_model: object, _metadata: dict, criterion: object) -> RuleResult:
        severity = getattr(criterion, "severity", "baixa")
        return RuleResult(
            status="not_evaluated",
            severity=severity,
            message=f"Evaluator for '{rule_type}' is not implemented yet.",
        )

    return placeholder
