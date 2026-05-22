def validate_spatial_structure(has_project: bool, has_site_or_building: bool) -> bool:
    return has_project and has_site_or_building
