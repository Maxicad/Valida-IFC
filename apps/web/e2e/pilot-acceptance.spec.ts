import { expect, type Page, test } from "@playwright/test";
import path from "node:path";

const pilotIfcPath = process.env.PILOT_IFC_PATH;
const criteriaPath = process.env.PILOT_CRITERIA_PATH ?? path.resolve("../../samples/criteria/criterios_exemplo.csv");

async function evidence(page: Page, name: string) {
  await page.screenshot({
    path: path.join(test.info().outputDir, `${name}.png`),
    fullPage: true,
  });
}

test("pilot real IFC -> auditoria rapida -> viewer -> relatorio", async ({ page, context }) => {
  test.skip(!pilotIfcPath, "Set PILOT_IFC_PATH to run the real pilot acceptance test.");
  test.setTimeout(180_000);

  const ifcFileName = path.basename(pilotIfcPath ?? "");
  const suffix = Date.now();
  const email = `pilot.acceptance.${suffix}@example.com`;
  const projectName = `Piloto real ${suffix}`;

  await page.goto("/login");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Auditor Piloto");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: /Criar conta e entrar/ }).click();
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  await evidence(page, "pilot-01-dashboard");

  await page.goto("/projetos");
  await page.getByLabel("Nome do projeto").fill(projectName);
  await page.getByLabel("Cliente").fill("MaxiCAD Projetos");
  await page.getByRole("button", { name: /Criar projeto/ }).click();
  await expect(page.getByText(projectName)).toBeVisible();
  await evidence(page, "pilot-02-projeto");

  await page.goto("/projetos/upload");
  await page.locator("select").first().selectOption({ label: projectName });
  await page.locator('input[type="file"][accept=".ifc"]').setInputFiles(pilotIfcPath ?? "");
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByText(/enviado com sucesso/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(ifcFileName, { exact: true })).toBeVisible();
  await evidence(page, "pilot-03-upload-real-ifc");

  await page.goto("/criterios");
  await page.locator('input[type="file"][accept=".csv,.txt,.xls,.xlsx,.ids,.xml"]').setInputFiles(criteriaPath);
  await page.getByRole("button", { name: "Importar arquivo" }).click();
  await expect(page.getByText("Importacao concluida")).toBeVisible();
  await expect(page.getByText("IFC-001").first()).toBeVisible();
  await evidence(page, "pilot-04-criterios");

  await page.goto("/auditorias");
  await expect(page.getByRole("heading", { name: "Auditoria rapida" })).toBeVisible();
  await expect(page.getByText(projectName).first()).toBeVisible();
  await expect(page.getByText(ifcFileName).first()).toBeVisible();
  const auditResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/audits?mode=async") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Executar auditoria" }).click();
  const auditResponse = await auditResponsePromise;
  expect(auditResponse.status()).toBe(201);
  const audit = (await auditResponse.json()) as { id: string; status: string; queue_job_id?: string | null };
  expect(audit.status).toBe("pending");
  expect(audit.queue_job_id).toBeTruthy();
  await expect(page.getByText("Auditoria concluida.")).toBeVisible({ timeout: 90_000 });

  const token = await page.evaluate(() => window.localStorage.getItem("valida-ifc-token"));
  expect(token).toBeTruthy();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001";
  const finalStatus = await page.request.get(`${apiBaseUrl}/audits/${audit.id}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(finalStatus.ok()).toBeTruthy();
  expect((await finalStatus.json()).status).toBe("completed");
  await expect(page.getByText("IFC-001").first()).toBeVisible();
  const reportHref = await page.getByRole("link", { name: "Relatorio HTML" }).getAttribute("href");
  expect(reportHref).toBeTruthy();
  await evidence(page, "pilot-05-auditoria");

  const viewerHref = await page.getByRole("link", { name: "Abrir visualizador" }).getAttribute("href");
  expect(viewerHref).toBeTruthy();
  await page.goto(viewerHref ?? "");
  await expect(page.getByRole("heading", { name: "Visualizador IFC" })).toBeVisible();
  await expect(page.getByLabel("Arquivo IFC")).toContainText(ifcFileName);
  await expect(page.getByText("Triangulos")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Canvas")).toBeVisible();
  await evidence(page, "pilot-06-viewer");

  const reportPage = await context.newPage();
  await reportPage.goto(reportHref ?? "");
  await expect(reportPage.getByText("Relatorio de Auditoria IFC")).toBeVisible();
  await expect(reportPage.getByText(ifcFileName).first()).toBeVisible();
  await expect(reportPage.getByText("Criterios", { exact: true })).toBeVisible();
  await evidence(reportPage, "pilot-07-relatorio");
});
