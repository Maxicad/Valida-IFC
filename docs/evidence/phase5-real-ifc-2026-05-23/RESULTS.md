# Phase 5 real IFC viewer performance evidence

Date: 2026-05-23
Source dataset: `G:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM`

## Tested model

- File: `SALE-ELE-PB-0000-EMBA-MODE-R02.ifc`
- Path: `G:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM\07 - Elétrica\07 - Obsoletos\01 - Projeto básico\SALE-ELE-PB-0000-EMBA-MODE-R02.ifc`
- Size: 85.08 MB
- Browser loader: `web-ifc`
- Browser-extracted triangles: 2,072,009
- Heap after load/orbit/filter: about 289.9 MB used JS heap

## Viewer evidence

- Browser loader opened the real IFC in the browser and exposed geometry on the Three.js canvas.
- Canvas screenshot: `viewer-1-01-loaded.png`
- GlobalId filter screenshot: `viewer-1-02-globalid-filter.png`
- Criteria-code filter screenshot: `viewer-1-03-code-filter.png`
- Raw metrics JSON: `viewer-performance-results.json`
- Repro script: `run-viewer-performance.mjs`

## Interaction metrics

- Idle frame rate after load: 60 FPS average, p95 frame time 16.7 ms, 0 long frames over 50 ms.
- Orbit interaction: 60 FPS average, p95 frame time 16.7 ms, 0 long frames over 50 ms.
- Filter interaction: 60 FPS average, p95 frame time 16.8 ms, 0 long frames over 50 ms.
- Console errors: none.
- Page errors: none.

## Inspection checks

- Audit fixture completed successfully against the real IFC.
- Target entity: `IfcBuildingElementProxy`
- Target GlobalId: `3go9mrRuDDUfE_zzaW_khg`
- Synthetic failed results for viewer inspection: 933
- GlobalId search returned the target element.
- Criteria-code filter `PERF-GID-001` returned the failed target element.
- Failed-elements list remained clickable and tied to GlobalId selection.

## Fixes applied during the gate

- Fixed `web-ifc` cleanup compatibility when `flatMesh.delete` is not exposed by the runtime object.
- Fixed viewer canvas initialization after authenticated `AppShell` readiness; the Three.js canvas now initializes when the host node actually mounts.
- Added progressive mesh mounting, stale-render cancellation, lightweight material rendering, capped pixel ratio, render-on-demand, and a large-model canvas budget.

## Decision

GO for Phase 5 with browser-grade large-model behavior based on an 85 MB real IFC. The viewer intentionally uses an interactive canvas budget on large models instead of drawing every extracted triangle in the initial panorama; targeted GlobalId/code/status filters remain the path for precise inspection.
