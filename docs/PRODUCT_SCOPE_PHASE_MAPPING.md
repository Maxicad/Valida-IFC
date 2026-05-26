# Product Scope Phase Mapping - Valida IFC

Last update: 2026-05-26
Reference timezone: America/Sao_Paulo

This document maps the strategic product scope against the technical phases of the Valida IFC project. It exists to keep the Alfa lean, make the current proposal explicit, and prevent future openBIM items from blocking the first validated release.

## Product position

Valida IFC is not positioned as a replacement for Solibri, Revit, or any authoring tool. The product position is:

- receive IFC models and BIM audit criteria;
- execute traceable validation by rule, severity and element;
- show nonconformities in data tables and in the 3D model;
- produce technical evidence that can be delivered to a BIM coordinator, client or project team;
- keep the workflow web-based, lightweight and openBIM-first.

## Scope by strategic item

| Strategic item | Product intent | Phase placement | Current status | Notes |
| --- | --- | --- | --- | --- |
| BIM criteria in CSV/XLS/IDS | Let auditors bring existing BIM requirements without rewriting them manually. | Phase 3 for CSV/TXT/XLS/XLSX. Phase 8 for IDS MVP. Beta for broader IDS semantics and possible IDS export. | Alfa scope, technically implemented for current MVP subset. | CSV/XLS keeps spreadsheet-based teams onboard. IDS keeps the product aligned with openBIM. |
| Severity-based scoring | Convert pass/fail checks into a decision score weighted by low, moderate and high severity. | Phase 3 score baseline. Phase 4 persisted audit results. Phase 6 report presentation. | Alfa scope, implemented. | Must remain explainable: score, severity weights, failed high-severity criteria and element evidence. |
| Delivery-ready technical report | Produce an auditable deliverable, not just an on-screen result. | Phase 6 for HTML/PDF and print polish. Phase 7 for snapshots/history. Phase 9 for release/UAT evidence. | Alfa scope, implemented but still pending stakeholder sign-off. | Report should lead with executive summary, then technical details, fixes and affected elements. |
| 3D viewer with nonconformities by element | Connect audit results to GlobalId/element evidence so the auditor can inspect where each failure happens. | Phase 5. | Alfa scope, implemented with real IFC evidence. | Viewer is a differentiator, but should be opened from results; it should not slow the quick audit path. |
| Lightweight BIM auditor flow, independent of Solibri/Revit | Make the first useful audit possible in a browser with few decisions. | Phase 6 for quick audit UX. Phase 9 for onboarding/release readiness. | Alfa scope, partially complete because production GO is blocked by non-technical sign-off/support items. | The product may provide Revit/Archicad fix guidance, but should not require those tools to validate IFC. |
| Future BCF/IDS/API/self-host | Expand interoperability, automation and deployment options after Alfa proves the core workflow. | Beta/Post-Alfa. Phase 10 proposed for openBIM extensions and deployment model. | Not production scope for Alfa. | BCF export, broader IDS, public API and self-host packaging must be gated by pilot demand and support readiness. |

## Phase allocation

### Phase 0 - Governance and setup

Owns project structure, baseline documentation and execution discipline.

### Phase 1 - Core platform baseline

Owns initial frontend, backend, worker scaffold, shared packages and test shape.

### Phase 2 - Persistence and auth

Owns users, projects, files, criteria sets, criteria, audits, persistence and protected access.

### Phase 3 - IFC ingestion and criteria import

Owns the first value input:

- upload IFC;
- read `FILE_SCHEMA`;
- import BIM criteria from CSV/TXT/XLS/XLSX;
- validate rule fields;
- normalize severity;
- calculate the first weighted score.

### Phase 4 - Audit engine and async processing

Owns reliable audit execution:

- rule orchestration;
- persisted audit runs/results;
- result rows by criterion and element when applicable;
- async worker;
- failed job handling.

### Phase 5 - IFC viewer

Owns spatial inspection:

- real IFC loading;
- GlobalId mapping;
- status/severity colors;
- filters by status, severity, rule code and GlobalId;
- focus on nonconforming elements.

### Phase 6 - Simple UX and reporting polish

Owns the lightweight auditor experience:

- quick audit path;
- report HTML/PDF;
- executive summary;
- correction suggestions;
- print-ready output.

### Phase 7 - Lightweight collaboration and project history

Owns evidence sharing without heavy collaboration:

- read-only snapshots;
- project audit timeline;
- comparison between runs;
- visual regression evidence.

### Phase 8 - Pragmatic openBIM and essential hardening

Owns the openBIM MVP:

- IDS MVP import;
- mapping IDS to internal rules for common cases;
- fix guides;
- security and lifecycle hardening;
- load and observability drills.

### Phase 9 - Lean release readiness and go-live

Owns Alfa release gates:

- release checklist;
- user guide;
- pilot acceptance with real IFC;
- Google login for onboarding;
- rollback dry-run;
- stakeholder sign-off;
- named support rotation and notification channel.

### Phase 10 - Beta openBIM extensions and deployment model

Starts only after Alfa validation. Candidate scope:

- BCF export for nonconformities;
- broader IDS support and optional IDS export;
- public API for external audit execution;
- self-host packaging and deployment guide;
- bSDD and additional integrations if demanded by pilot usage;
- quantities, IA, natural-language audit requests, clash and search sets only if Beta validation supports them.

## Alfa boundaries

Alfa should include:

- BIM criteria import through spreadsheet formats and IDS MVP;
- severity-based score;
- delivery-ready report;
- 3D inspection of element-level failures;
- quick audit flow;
- shareable evidence;
- real-pilot UAT.

Alfa should not include:

- full BCF workflow;
- full IDS authoring/editor;
- public API commitment;
- self-host customer packaging;
- IA assistant;
- natural-language audit execution;
- clash detection;
- complex collaboration workflow.

## Gate for future scope

Do not start Phase 10 as product scope until Phase 9 closes with:

- stakeholder sign-off recorded;
- support owner and backup named;
- notification channel active;
- at least one real pilot accepted or rejected with notes;
- product decision confirming the audit journey is useful, understandable and repeatable.
