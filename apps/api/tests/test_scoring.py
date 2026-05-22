from rules_engine.scoring import calculate_score
from rules_engine.severity import normalize_severity


def test_normalizes_severity_aliases() -> None:
    assert normalize_severity("Alta") == "alta"
    assert normalize_severity("moderado") == "moderada"
    assert normalize_severity("low") == "baixa"


def test_calculates_weighted_score() -> None:
    score = calculate_score(
        [
            {"severity": "alta", "status": "approved"},
            {"severity": "alta", "status": "failed"},
            {"severity": "moderada", "status": "approved"},
            {"severity": "baixa", "status": "approved"},
        ]
    )

    assert score.max_score == 14
    assert score.obtained_score == 9
    assert score.score_percent == 64.29
    assert score.has_high_severity_failure is True
    assert score.classification == "Reprovado parcialmente"
