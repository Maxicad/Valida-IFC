from ifc_utils.ifc_reader import read_ifc_schema_from_file


def parse_ifc(path: str) -> dict:
    return {"path": path, "schema": read_ifc_schema_from_file(path)}
