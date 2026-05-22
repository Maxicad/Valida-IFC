import re
from dataclasses import dataclass

from app.audits.ifc_adapter import IfcAuditContext, IfcElementRef
from app.core.models import Criterion, IfcFile
from rules_engine.severity import severity_weight


@dataclass(frozen=True)
class EvaluatedCriterion:
    criteria_id: str
    code: str
    status: str
    severity: str
    message: str
    actual_value: str | None
    expected_value: str | None
    weight: int
    score_value: int
    fix_suggestion: str | None = None
    is_summary: bool = False
    element_guid: str | None = None
    element_type: str | None = None
    element_name: str | None = None


@dataclass(frozen=True)
class AuditEvaluationBundle:
    summary_results: list[EvaluatedCriterion]
    detailed_results: list[EvaluatedCriterion]


def evaluate_criteria(ifc_file: IfcFile, criteria: list[Criterion]) -> AuditEvaluationBundle:
    context = IfcAuditContext(ifc_file.file_path, schema_hint=ifc_file.ifc_schema)
    summary_results: list[EvaluatedCriterion] = []
    detailed_results: list[EvaluatedCriterion] = []

    for criterion in criteria:
        criterion_results = evaluate_criterion(context, criterion)
        summary_results.extend([row for row in criterion_results if row.is_summary])
        detailed_results.extend(criterion_results)

    return AuditEvaluationBundle(summary_results=summary_results, detailed_results=detailed_results)


def evaluate_criterion(context: IfcAuditContext, criterion: Criterion) -> list[EvaluatedCriterion]:
    rule_type = criterion.rule_type
    if rule_type == "ifc_schema":
        return evaluate_ifc_schema(context.schema, criterion)
    if rule_type == "entity_exists":
        return evaluate_entity_exists(context, criterion)
    if rule_type == "entity_count_min":
        return evaluate_entity_count_min(context, criterion)
    if rule_type == "property_exists":
        return evaluate_property(context, criterion, require_value=False)
    if rule_type == "property_not_empty":
        return evaluate_property(context, criterion, require_value=True)
    if rule_type == "globalid_unique":
        return evaluate_globalid_unique(context, criterion)

    return [
        summary_result(
            criterion=criterion,
            status="failed",
            message=f"Regra '{rule_type}' ainda nao possui avaliador implementado.",
            actual_value=None,
            expected_value=criterion.expected_value,
        )
    ]


def evaluate_ifc_schema(schema: str | None, criterion: Criterion) -> list[EvaluatedCriterion]:
    allowed = split_expected_values(criterion.expected_value)
    approved = schema in allowed
    return [
        summary_result(
            criterion=criterion,
            status="approved" if approved else "failed",
            message=criterion.failure_message
            if not approved and criterion.failure_message
            else f"Schema IFC {'aprovado' if approved else 'reprovado'}: {schema or 'nao identificado'}.",
            actual_value=schema,
            expected_value="|".join(allowed),
        )
    ]


def evaluate_entity_exists(context: IfcAuditContext, criterion: Criterion) -> list[EvaluatedCriterion]:
    count = context.count_entities(criterion.entity_ifc)
    approved = count > 0
    return [
        summary_result(
            criterion=criterion,
            status="approved" if approved else "failed",
            message=criterion.failure_message
            if not approved and criterion.failure_message
            else f"{criterion.entity_ifc} encontrado: {count}.",
            actual_value=str(count),
            expected_value=">0",
        )
    ]


def evaluate_entity_count_min(context: IfcAuditContext, criterion: Criterion) -> list[EvaluatedCriterion]:
    count = context.count_entities(criterion.entity_ifc)
    minimum = int(str(criterion.expected_value or "1").strip())
    approved = count >= minimum
    return [
        summary_result(
            criterion=criterion,
            status="approved" if approved else "failed",
            message=criterion.failure_message
            if not approved and criterion.failure_message
            else f"{criterion.entity_ifc} encontrados: {count}.",
            actual_value=str(count),
            expected_value=str(minimum),
        )
    ]


def evaluate_property(context: IfcAuditContext, criterion: Criterion, require_value: bool) -> list[EvaluatedCriterion]:
    entity = criterion.entity_ifc
    property_name = criterion.property_name
    instances = context.list_elements(entity)
    if not instances:
        return [
            summary_result(
                criterion=criterion,
                status="failed",
                message=f"Nenhuma instancia de {entity} encontrada.",
                actual_value="0",
                expected_value=">0",
            )
        ]

    detailed: list[EvaluatedCriterion] = []
    approved_count = 0
    failed_count = 0

    for element in instances:
        raw_value = context.get_property_value(element, property_name)
        has_value = raw_value not in {None, "", "$", "*"}
        approved = has_value if require_value else raw_value is not None

        if approved:
            approved_count += 1
        else:
            failed_count += 1

        detailed.append(
            detailed_result(
                criterion=criterion,
                status="approved" if approved else "failed",
                message=_property_result_message(property_name, raw_value, approved, criterion),
                actual_value=raw_value,
                expected_value="valor preenchido" if require_value else "propriedade existente",
                element=element,
            )
        )

    summary_status = "approved" if failed_count == 0 else "failed"
    summary_message = (
        criterion.failure_message
        if summary_status == "failed" and criterion.failure_message
        else f"{property_name} valido em {approved_count}/{len(instances)} instancias de {entity}."
    )
    detailed.insert(
        0,
        summary_result(
            criterion=criterion,
            status=summary_status,
            message=summary_message,
            actual_value=f"{approved_count}/{len(instances)}",
            expected_value="todos preenchidos" if require_value else "propriedade existente",
        ),
    )
    return detailed


def evaluate_globalid_unique(context: IfcAuditContext, criterion: Criterion) -> list[EvaluatedCriterion]:
    duplicates = context.duplicate_global_ids(criterion.entity_ifc)
    duplicate_count = sum(len(rows) for rows in duplicates.values())
    approved = duplicate_count == 0

    results: list[EvaluatedCriterion] = [
        summary_result(
            criterion=criterion,
            status="approved" if approved else "failed",
            message=criterion.failure_message
            if not approved and criterion.failure_message
            else f"GlobalIds duplicados identificados: {duplicate_count}.",
            actual_value=str(duplicate_count),
            expected_value="0",
        )
    ]
    for guid, rows in duplicates.items():
        for element in rows:
            results.append(
                detailed_result(
                    criterion=criterion,
                    status="failed",
                    message=f"GlobalId duplicado encontrado: {guid}.",
                    actual_value=guid,
                    expected_value="GlobalId unico",
                    element=element,
                )
            )
    return results


def summary_result(
    criterion: Criterion,
    status: str,
    message: str,
    actual_value: str | None,
    expected_value: str | None,
) -> EvaluatedCriterion:
    weight = severity_weight(criterion.severity)
    return EvaluatedCriterion(
        criteria_id=criterion.id,
        code=criterion.code,
        status=status,
        severity=criterion.severity,
        message=message,
        actual_value=actual_value,
        expected_value=expected_value,
        weight=weight,
        score_value=weight if status == "approved" else 0,
        fix_suggestion=criterion.fix_suggestion,
        is_summary=True,
    )


def detailed_result(
    criterion: Criterion,
    status: str,
    message: str,
    actual_value: str | None,
    expected_value: str | None,
    element: IfcElementRef,
) -> EvaluatedCriterion:
    weight = severity_weight(criterion.severity)
    return EvaluatedCriterion(
        criteria_id=criterion.id,
        code=criterion.code,
        status=status,
        severity=criterion.severity,
        message=message,
        actual_value=actual_value,
        expected_value=expected_value,
        weight=weight,
        score_value=weight if status == "approved" else 0,
        fix_suggestion=criterion.fix_suggestion,
        element_guid=element.guid,
        element_type=element.entity,
        element_name=element.name,
    )


def split_expected_values(value: str | None) -> list[str]:
    if value is None:
        return []
    return [part.strip().upper() for part in re.split(r"[|,;]", value) if part.strip()]


def _property_result_message(
    property_name: str | None,
    value: str | None,
    approved: bool,
    criterion: Criterion,
) -> str:
    if not approved and criterion.failure_message:
        return criterion.failure_message
    if approved:
        return f"{property_name} valido ({value})."
    return f"{property_name} ausente ou vazio."
