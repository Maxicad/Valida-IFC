import { expect, test } from "@playwright/test";

const projects = [
  {
    id: "project-visual",
    name: "Projeto Visual",
    client: "Cliente Controle",
    description: null,
    discipline: "Arquitetura",
    phase: "Executivo",
    responsible: "Auditor Visual",
    status: "em_auditoria",
    created_at: "2026-05-24T09:00:00Z",
    updated_at: "2026-05-24T09:00:00Z",
  },
];

const criteriaSets = [
  {
    id: "criteria-visual",
    name: "Criterios Visuais",
    description: null,
    source_type: "csv",
    created_at: "2026-05-24T09:10:00Z",
    updated_at: "2026-05-24T09:10:00Z",
  },
];

const ifcFiles = [
  {
    id: "ifc-visual",
    project_id: "project-visual",
    file_name: "modelo-visual.ifc",
    file_size: 2048,
    ifc_schema: "IFC4",
    ifc_version: null,
    uploaded_at: "2026-05-24T09:20:00Z",
    status: "uploaded",
    metadata_json: null,
  },
];

const auditHistory = [
  {
    id: "audit-current",
    project_id: "project-visual",
    ifc_file_id: "ifc-visual",
    criteria_set_id: "criteria-visual",
    status: "completed",
    score_percent: 100,
    score_low: 100,
    score_moderate: 100,
    score_high: 100,
    total_criteria: 2,
    approved_criteria: 2,
    failed_criteria: 0,
    started_at: "2026-05-24T09:40:00Z",
    finished_at: "2026-05-24T09:41:00Z",
    queue_job_id: "job-current",
    error_message: null,
    project_name: "Projeto Visual",
    ifc_file_name: "modelo-visual.ifc",
    criteria_set_name: "Criterios Visuais",
    snapshot_count: 1,
  },
  {
    id: "audit-base",
    project_id: "project-visual",
    ifc_file_id: "ifc-visual",
    criteria_set_id: "criteria-visual",
    status: "completed",
    score_percent: 50,
    score_low: 100,
    score_moderate: 100,
    score_high: 0,
    total_criteria: 2,
    approved_criteria: 1,
    failed_criteria: 1,
    started_at: "2026-05-24T09:30:00Z",
    finished_at: "2026-05-24T09:31:00Z",
    queue_job_id: "job-base",
    error_message: null,
    project_name: "Projeto Visual",
    ifc_file_name: "modelo-visual.ifc",
    criteria_set_name: "Criterios Visuais",
    snapshot_count: 0,
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("valida-ifc-token", "visual-token");
  });

  await page.route("**/projects/project-visual/ifc-files", async (route) => {
    await route.fulfill({ json: ifcFiles });
  });
  await page.route("**/audits/project/project-visual/history", async (route) => {
    await route.fulfill({ json: auditHistory });
  });
  await page.route("**/criteria-sets", async (route) => {
    await route.fulfill({ json: criteriaSets });
  });
  await page.route("**/projects", async (route) => {
    await route.fulfill({ json: projects });
  });
});

test("core screens match pixel baselines", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard de validacao IFC" })).toBeVisible();
  await expect(page).toHaveScreenshot("dashboard-core.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.03,
  });

  await page.goto("/auditorias");
  await expect(page.getByRole("heading", { name: "Auditoria rapida" })).toBeVisible();
  await expect(page).toHaveScreenshot("auditorias-core.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.03,
  });

  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatorios e snapshots" })).toBeVisible();
  await expect(page).toHaveScreenshot("relatorios-core.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.03,
  });
});
