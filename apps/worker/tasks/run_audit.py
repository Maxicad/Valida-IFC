from rules_engine.scoring import calculate_score


def run_audit(results: list[dict]) -> dict:
    return calculate_score(results).__dict__
