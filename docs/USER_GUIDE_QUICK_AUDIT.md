# User Guide - Auditoria Rapida

Last update: 2026-05-24
Audience: BIM auditor, project coordinator and pilot stakeholder.

## Auditoria rapida

Use this path when the goal is to validate one IFC model with an existing rule set and produce evidence quickly.

1. Open Valida IFC and sign in.
2. Go to `Projetos`.
3. Create or select the project that will receive the model.
4. Open `Projetos > Upload IFC`.
5. Upload the IFC file and wait for the upload confirmation.
6. Go to `Criterios`.
7. Import a CSV, IDS or XML criteria file, or select an existing criteria set.
8. Go to `Auditorias`.
9. Select the project, IFC file and criteria set.
10. Run the audit and wait until the status is completed.
11. Open `Visualizador` to inspect failing elements by code, status or GlobalId.
12. Open `Relatorios` to review the executive summary and export/share evidence.

## What to check before accepting the result

- The uploaded IFC belongs to the intended project.
- The criteria set name and version match the expected pilot rules.
- The audit status is completed, not failed or running.
- The report shows total checks, passed checks, failed checks and severity.
- At least one failing item has actionable correction guidance when applicable.
- The viewer opens and can focus an element from the issue list.

## Fast troubleshooting

- If upload fails, confirm that the file extension is `.ifc` and retry with a smaller model to isolate file-size or model issues.
- If criteria import fails, check the first validation error and fix the CSV/IDS/XML structure before retrying.
- If the audit stays pending/running, check `GET /alerts` and worker logs using the audit id.
- If the viewer does not load geometry, use the report and element list as fallback evidence, then capture the model name and audit id for support.

## Evidence to save during pilot UAT

- Project name.
- IFC file name and source.
- Criteria set name and source.
- Audit id.
- Report export.
- Screenshot of the viewer with at least one selected element.
- Stakeholder acceptance or rejection notes.
