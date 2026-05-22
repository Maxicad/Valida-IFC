def validate_global_ids_unique(global_ids: list[str]) -> bool:
    return len(global_ids) == len(set(global_ids))
