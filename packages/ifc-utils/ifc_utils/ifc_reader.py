import re
from pathlib import Path

FILE_SCHEMA_PATTERN = re.compile(r"FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'\s*\)\s*\)", re.IGNORECASE)


def read_ifc_schema_from_text(content: str) -> str | None:
    match = FILE_SCHEMA_PATTERN.search(content)
    if not match:
        return None
    return match.group(1).upper()


def read_ifc_schema_from_bytes(content: bytes) -> str | None:
    header = content[:8192].decode("utf-8", errors="ignore")
    return read_ifc_schema_from_text(header)


def read_ifc_schema_from_file(path: str | Path) -> str | None:
    with Path(path).open("rb") as file:
        return read_ifc_schema_from_bytes(file.read(8192))
