from ifc_utils.ifc_reader import read_ifc_schema_from_bytes


def build_metadata_from_header(content: bytes) -> dict:
    schema = read_ifc_schema_from_bytes(content)
    return {
        "schema": schema,
        "ifc_version": schema,
        "header_bytes_read": min(len(content), 8192),
    }
