from ifc_utils.ifc_reader import read_ifc_schema_from_bytes, read_ifc_schema_from_text


def test_reads_ifc4_schema_from_header_text() -> None:
    content = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;"

    assert read_ifc_schema_from_text(content) == "IFC4"


def test_reads_ifc4x3_schema_from_bytes() -> None:
    content = b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4X3'));\nENDSEC;"

    assert read_ifc_schema_from_bytes(content) == "IFC4X3"


def test_returns_none_when_schema_is_missing() -> None:
    assert read_ifc_schema_from_text("ISO-10303-21;") is None
