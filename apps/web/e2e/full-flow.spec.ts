import { expect, type Page, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

async function evidence(page: Page, name: string) {
  await page.screenshot({
    path: path.join(test.info().outputDir, `${name}.png`),
    fullPage: true,
  });
}

test("registro/login -> projeto -> upload IFC -> criterios -> auditoria -> viewer -> relatorio", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const email = `auditor.e2e.${suffix}@example.com`;
  const projectName = `Projeto E2E ${suffix}`;
  const flowStartedAt = Date.now();

  await page.goto("/login");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Auditor E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: /Criar conta e entrar/ }).click();
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  await evidence(page, "01-dashboard");

  await page.goto("/projetos");
  await page.getByLabel("Nome do projeto").fill(projectName);
  await page.getByLabel("Cliente").fill("Cliente E2E");
  await page.getByRole("button", { name: /Criar projeto/ }).click();
  await expect(page.getByText(projectName)).toBeVisible();
  await evidence(page, "02-projeto");

  await page.goto("/projetos/upload");
  const uploadProjectSelect = page.locator("select").first();
  await expect(uploadProjectSelect).toContainText(projectName);
  await uploadProjectSelect.selectOption({ label: projectName });
  await page.locator('input[type="file"][accept=".ifc"]').setInputFiles(path.join(fixturesDir, "modelo-e2e.ifc"));
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByText(/enviado com sucesso/i)).toBeVisible();
  await expect(page.getByText("modelo-e2e.ifc", { exact: true })).toBeVisible();
  await evidence(page, "03-upload-ifc");

  await page.goto("/criterios");
  await page
    .locator('input[type="file"][accept=".csv,.txt,.xls,.xlsx,.ids,.xml"]')
    .setInputFiles(path.join(fixturesDir, "criterios-e2e.csv"));
  await page.getByRole("button", { name: "Importar arquivo" }).click();
  await expect(page.getByText("Importacao concluida")).toBeVisible();
  await expect(page.getByText("IFC-PROP-001")).toBeVisible();
  await evidence(page, "04-criterios");

  await page.goto("/auditorias");
  await expect(page.getByRole("heading", { name: "Auditoria rapida" })).toBeVisible();
  await expect(page.getByText("Pronto para executar com os dados mais recentes.")).toBeVisible();
  await expect(page.getByText(projectName).first()).toBeVisible();
  await expect(page.getByText("modelo-e2e.ifc").first()).toBeVisible();
  await expect(page.getByLabel("Conjunto de criterios")).toContainText("criterios-e2e");
  await expect(page.getByLabel("Projeto")).toContainText(projectName);
  const ifcFileSelect = page.getByLabel("Arquivo IFC");
  await expect(ifcFileSelect).toContainText("modelo-e2e.ifc");
  const ifcFileValue = await ifcFileSelect.locator("option", { hasText: "modelo-e2e.ifc" }).first().getAttribute("value");
  expect(ifcFileValue).toBeTruthy();
  await expect(ifcFileSelect).toHaveValue(ifcFileValue ?? "");
  const auditResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/audits?mode=async") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Executar auditoria" }).click();
  const auditResponse = await auditResponsePromise;
  expect(auditResponse.status()).toBe(201);
  const queuedAudit = (await auditResponse.json()) as { id: string; status: string; queue_job_id?: string | null };
  expect(queuedAudit.status).toBe("pending");
  expect(queuedAudit.queue_job_id).toBeTruthy();
  await expect(page.getByText("Auditoria concluida.")).toBeVisible({ timeout: 60_000 });
  expect(Date.now() - flowStartedAt).toBeLessThanOrEqual(180_000);
  const token = await page.evaluate(() => window.localStorage.getItem("valida-ifc-token"));
  expect(token).toBeTruthy();
  const finalStatus = await page.request.get(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001"}/audits/${queuedAudit.id}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(finalStatus.ok()).toBeTruthy();
  expect((await finalStatus.json()).status).toBe("completed");
  await expect(page.getByText("IFC-PROP-001").first()).toBeVisible();
  await expect(page.getByText("WALL_FAIL").first()).toBeVisible();
  const reportHref = await page.getByRole("link", { name: "Relatorio HTML" }).getAttribute("href");
  expect(reportHref).toBeTruthy();
  await evidence(page, "05-auditoria");

  const viewerHref = await page.getByRole("link", { name: "Abrir visualizador" }).getAttribute("href");
  expect(viewerHref).toBeTruthy();
  await page.goto(viewerHref ?? "");
  await expect(page.getByRole("heading", { name: "Visualizador IFC" })).toBeVisible();
  await expect(page.getByText("WALL_FAIL").first()).toBeVisible();
  await evidence(page, "06-viewer");

  const reportPage = await context.newPage();
  await reportPage.goto(reportHref ?? "");
  await expect(reportPage.getByText("Relatorio de Auditoria IFC")).toBeVisible();
  await expect(reportPage.getByText("IFC-PROP-001").first()).toBeVisible();
  await evidence(reportPage, "07-relatorio");

  await page.goto("/projetos/upload");
  await expect(uploadProjectSelect).toContainText(projectName);
  await page.locator("select").first().selectOption({ label: projectName });
  await page
    .locator('input[type="file"][accept=".ifc"]')
    .setInputFiles(path.join(fixturesDir, "modelo-e2e-corrigido.ifc"));
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByText(/enviado com sucesso/i)).toBeVisible();
  await expect(page.getByText("modelo-e2e-corrigido.ifc", { exact: true })).toBeVisible();

  await page.goto("/auditorias");
  await expect(page.getByText("modelo-e2e-corrigido.ifc").first()).toBeVisible();
  const secondAuditResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/audits?mode=async") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Executar auditoria" }).click();
  const secondAuditResponse = await secondAuditResponsePromise;
  expect(secondAuditResponse.status()).toBe(201);
  const secondAudit = (await secondAuditResponse.json()) as { id: string; status: string; queue_job_id?: string | null };
  expect(secondAudit.queue_job_id).toBeTruthy();
  await expect(page.getByText("Auditoria concluida.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("100%").first()).toBeVisible();

  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatorios e snapshots" })).toBeVisible();
  await expect(page.getByText("modelo-e2e-corrigido.ifc").first()).toBeVisible();
  await expect(page.getByText("modelo-e2e.ifc").first()).toBeVisible();
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page.getByText("Resolvidas")).toBeVisible();
  await expect(page.getByText("WALL_FAIL").first()).toBeVisible();
  await page.getByRole("button", { name: "Gerar link" }).first().click();
  await expect(page.getByRole("link", { name: "Snapshot" }).first()).toBeVisible();
  const snapshotHref = await page.getByRole("link", { name: "Snapshot" }).first().getAttribute("href");
  expect(snapshotHref).toBeTruthy();
  const snapshotPage = await context.newPage();
  await snapshotPage.goto(snapshotHref ?? "");
  await expect(snapshotPage.getByText("Snapshot read-only")).toBeVisible();
  await expect(snapshotPage.getByText(projectName)).toBeVisible();
  await evidence(page, "08-historico-comparacao");
  await evidence(snapshotPage, "09-snapshot-readonly");
});

test("IDS MVP import -> auditoria -> guia de correcao visivel", async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now();
  const email = `ids.e2e.${suffix}@example.com`;
  const projectName = `Projeto IDS ${suffix}`;
  const idsSetName = `IDS E2E ${suffix}`;

  await page.goto("/login");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Auditor IDS");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: /Criar conta e entrar/ }).click();
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();

  await page.goto("/projetos");
  await page.getByLabel("Nome do projeto").fill(projectName);
  await page.getByLabel("Cliente").fill("Cliente IDS");
  await page.getByRole("button", { name: /Criar projeto/ }).click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.goto("/projetos/upload");
  await page.locator("select").first().selectOption({ label: projectName });
  await page.locator('input[type="file"][accept=".ifc"]').setInputFiles(path.join(fixturesDir, "modelo-e2e.ifc"));
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByText(/enviado com sucesso/i)).toBeVisible();

  await page.goto("/criterios");
  await page.getByPlaceholder("Nome do conjunto").fill(idsSetName);
  await page.getByRole("button", { name: "Criar conjunto" }).click();
  await expect(page.locator("select").first()).toContainText(idsSetName);
  await page.locator("select").first().selectOption({ label: idsSetName });
  await page
    .locator('input[type="file"][accept=".csv,.txt,.xls,.xlsx,.ids,.xml"]')
    .setInputFiles(path.join(fixturesDir, "criterios-ids.ids"));
  await page.getByRole("button", { name: "Importar arquivo" }).click();
  await expect(page.getByText("Importacao concluida")).toBeVisible();
  await expect(page.getByText("IDS-001-01")).toBeVisible();

  await page.goto("/auditorias");
  await expect(page.getByText(projectName).first()).toBeVisible();
  await expect(page.getByText("modelo-e2e.ifc").first()).toBeVisible();
  await expect(page.getByText(idsSetName).first()).toBeVisible();
  await page.getByRole("button", { name: "Executar auditoria" }).click();
  await expect(page.getByText("Auditoria concluida.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("IDS-001-01").first()).toBeVisible();
  await expect(page.getByText("WALL_FAIL").first()).toBeVisible();
  await expect(page.getByText(/Revit\/Archicad: preencha Name/i).first()).toBeVisible();
  await evidence(page, "10-ids-fix-guide");
});
