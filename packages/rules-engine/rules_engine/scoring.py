from dataclasses import dataclass, field
from typing import Iterable, Mapping

from rules_engine.severity import SEVERITY_WEIGHTS, normalize_severity, severity_weight

APPROVED_STATUSES = {"approved", "aprovado", "pass", "passed"}
FAILED_STATUSES = {"failed", "reprovado", "fail"}


@dataclass(frozen=True)
class AuditScore:
    score_percent: float
    max_score: int
    obtained_score: int
    total_criteria: int
    approved_criteria: int
    failed_criteria: int
    by_severity: dict[str, float] = field(default_factory=dict)
    classification: str = "Sem criterios aplicaveis"
    has_high_severity_failure: bool = False


def calculate_score(results: Iterable[Mapping[str, str]]) -> AuditScore:
    max_score = 0
    obtained_score = 0
    total_criteria = 0
    approved_criteria = 0
    failed_criteria = 0
    has_high_severity_failure = False
    severity_totals = {key: {"max": 0, "obtained": 0} for key in SEVERITY_WEIGHTS}

    for result in results:
        severity = normalize_severity(str(result["severity"]))
        status = str(result["status"]).strip().lower()
        weight = severity_weight(severity)

        total_criteria += 1
        max_score += weight
        severity_totals[severity]["max"] += weight

        if status in APPROVED_STATUSES:
            approved_criteria += 1
            obtained_score += weight
            severity_totals[severity]["obtained"] += weight
        elif status in FAILED_STATUSES:
            failed_criteria += 1
            if severity == "alta":
                has_high_severity_failure = True

    if max_score == 0:
        return AuditScore(
            score_percent=0,
            max_score=0,
            obtained_score=0,
            total_criteria=0,
            approved_criteria=0,
            failed_criteria=0,
        )

    score_percent = round((obtained_score / max_score) * 100, 2)
    by_severity = {
        severity: round((values["obtained"] / values["max"]) * 100, 2) if values["max"] else 0
        for severity, values in severity_totals.items()
    }

    return AuditScore(
        score_percent=score_percent,
        max_score=max_score,
        obtained_score=obtained_score,
        total_criteria=total_criteria,
        approved_criteria=approved_criteria,
        failed_criteria=failed_criteria,
        by_severity=by_severity,
        classification=classify_score(score_percent, has_high_severity_failure),
        has_high_severity_failure=has_high_severity_failure,
    )


def classify_score(score_percent: float, has_high_severity_failure: bool = False) -> str:
    if score_percent >= 90 and not has_high_severity_failure:
        return "Aprovado"
    if score_percent >= 75:
        return "Aprovado com ressalvas"
    if score_percent >= 50:
        return "Reprovado parcialmente"
    return "Reprovado"
