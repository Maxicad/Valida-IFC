def build_fix_suggestion(
    *,
    rule_type: str | None,
    entity_ifc: str | None = None,
    property_name: str | None = None,
    expected_value: str | None = None,
) -> str | None:
    entity = entity_ifc or "elemento IFC"
    prop = property_name or "propriedade"
    expected = expected_value or "valor exigido"

    templates = {
        "ifc_schema": (
            f"Revit/Archicad: exporte novamente em uma versao IFC permitida ({expected}) e confirme o FILE_SCHEMA "
            "antes de reenviar."
        ),
        "entity_exists": (
            f"Revit/Archicad: crie ou classifique corretamente pelo menos um {entity}; depois exporte o IFC "
            "sem filtrar essa categoria."
        ),
        "property_exists": (
            f"Revit/Archicad: adicione o parametro {prop} ao {entity}, preencha no modelo autoral e exporte "
            "com conjuntos de propriedades habilitados."
        ),
        "property_not_empty": (
            f"Revit/Archicad: preencha {prop} nos elementos {entity} indicados e reexporte com propriedades "
            "IFC habilitadas."
        ),
        "property_value_equals": (
            f"Revit/Archicad: ajuste {prop} nos elementos {entity} para {expected} e rode a auditoria novamente."
        ),
        "property_value_in_list": (
            f"Revit/Archicad: escolha em {prop} um dos valores permitidos ({expected}) para os elementos "
            f"{entity} indicados."
        ),
        "classification_exists": (
            "Revit/Archicad: associe a classificacao exigida aos elementos e exporte o IFC preservando "
            "classificacoes."
        ),
        "geometry_exists": (
            f"Revit/Archicad: verifique se os elementos {entity} possuem geometria visivel/exportavel e se nao "
            "foram excluidos por filtro de exportacao."
        ),
    }
    return templates.get(rule_type)
