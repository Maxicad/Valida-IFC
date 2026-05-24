import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const requireFromWeb = createRequire(path.join(repoRoot, "apps/web/package.json"));
const { request, chromium } = requireFromWeb("@playwright/test");
const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3001";
const ifcPaths = (process.env.IFC_PATHS ?? process.env.IFC_PATH ?? "")
  .split(";")
  .map((item) => item.trim())
  .filter(Boolean);

if (!ifcPaths.length) {
  throw new Error("Set IFC_PATH or IFC_PATHS with one or more .ifc files.");
}

async function expectOk(response, label) {
  if (response.ok()) {
    return response;
  }
  const text = await response.text().catch(() => "");
  throw new Error(`${label} failed with HTTP ${response.status()}: ${text}`);
}

async function postJson(api, pathName, data, token) {
  const response = await api.post(pathName, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  await expectOk(response, `POST ${pathName}`);
  return response.json();
}

async function getJson(api, pathName, token) {
  const response = await api.get(pathName, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  await expectOk(response, `GET ${pathName}`);
  return response.json();
}

async function uploadIfc(api, projectId, ifcPath, token) {
  const bytes = await fs.readFile(ifcPath);
  const response = await api.post(`/projects/${projectId}/ifc/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      file: {
        name: path.basename(ifcPath),
        mimeType: "application/octet-stream",
        buffer: bytes,
      },
    },
    timeout: 240_000,
  });
  await expectOk(response, "IFC upload");
  return response.json();
}

async function createAuditFixture(api, projectId, ifcFileId, targetEntity, token) {
  const criteriaSet = await postJson(
    api,
    "/criteria-sets",
    {
      name: `Phase 5 viewer performance ${Date.now()}`,
      description: "Temporary criteria set for real IFC viewer inspection evidence.",
      source_type: "manual",
    },
    token,
  );
  await postJson(
    api,
    "/criteria",
    {
      criteria_set_id: criteriaSet.id,
      code: "PERF-GID-001",
      name: "Forcar falha rastreavel por GlobalId",
      severity: "alta",
      rule_type: "property_value_equals",
      entity_ifc: targetEntity,
      property_name: "Name",
      operator: "equals",
      expected_value: "__VALDA_IFC_EXPECTED_NEVER__",
      failure_message: "Falha sintética controlada para validar filtro por codigo e GlobalId.",
      fix_suggestion: "Usar apenas como evidencia tecnica do viewer.",
      active: true,
    },
    token,
  );
  const audit = await postJson(
    api,
    "/audits?mode=async",
    {
      project_id: projectId,
      ifc_file_id: ifcFileId,
      criteria_set_id: criteriaSet.id,
    },
    token,
  );

  const started = Date.now();
  let status = audit.status;
  while (Date.now() - started < 600_000) {
    const statusPayload = await getJson(api, `/audits/${audit.id}/status`, token);
    status = statusPayload.status;
    if (status === "completed") {
      const results = await getJson(api, `/audits/${audit.id}/results`, token);
      return { audit: statusPayload, criteriaSet, results };
    }
    if (status === "failed") {
      return { audit: statusPayload, criteriaSet, results: [] };
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  return {
    audit: { ...audit, status: "timeout" },
    criteriaSet,
    results: [],
  };
}

async function frameStats(page, durationMs) {
  return page.evaluate(async (duration) => {
    return new Promise((resolve) => {
      const deltas = [];
      let previous = 0;
      let started = 0;
      function step(timestamp) {
        if (!started) {
          started = timestamp;
        }
        if (previous) {
          deltas.push(timestamp - previous);
        }
        previous = timestamp;
        if (timestamp - started < duration) {
          requestAnimationFrame(step);
          return;
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        const avgDelta = deltas.reduce((sum, item) => sum + item, 0) / Math.max(deltas.length, 1);
        resolve({
          samples: deltas.length,
          fps_avg: Math.round((1000 / avgDelta) * 10) / 10,
          frame_ms_avg: Math.round(avgDelta * 10) / 10,
          frame_ms_p95: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 10) / 10,
          long_frames_over_50ms: deltas.filter((item) => item > 50).length,
        });
      }
      requestAnimationFrame(step);
    });
  }, durationMs);
}

async function heapStats(page) {
  return page.evaluate(() => {
    const runtime = performance;
    if (typeof globalThis.gc === "function") {
      globalThis.gc();
    }
    const memory = runtime.memory;
    if (!memory) {
      return null;
    }
    return {
      used_js_heap_mb: Math.round((memory.usedJSHeapSize / 1024 / 1024) * 10) / 10,
      total_js_heap_mb: Math.round((memory.totalJSHeapSize / 1024 / 1024) * 10) / 10,
      js_heap_limit_mb: Math.round((memory.jsHeapSizeLimit / 1024 / 1024) * 10) / 10,
    };
  });
}

async function runViewerMeasurement(ifcPath, index) {
  const fileStat = await fs.stat(ifcPath);
  const api = await request.newContext({ baseURL: apiBaseUrl, timeout: 240_000 });
  const suffix = `${Date.now()}-${index}`;
  const email = `phase5.viewer.${suffix}@example.com`;

  await postJson(api, "/auth/register", {
    name: "Phase 5 Viewer Evidence",
    email,
    password: "secret123",
    role: "auditor_bim",
  });
  const tokenPayload = await postJson(api, "/auth/login", { email, password: "secret123" });
  const token = tokenPayload.access_token;
  const project = await postJson(
    api,
    "/projects",
    {
      name: `Phase 5 Real IFC ${suffix}`,
      client: "MaxiCAD",
      description: "Real medium/large IFC viewer performance evidence.",
      discipline: "Viewer",
      phase: "Fase 5",
      responsible: "Codex",
    },
    token,
  );
  const ifcFile = await uploadIfc(api, project.id, ifcPath, token);

  const backendGeometryStarted = Date.now();
  const backendGeometry = await getJson(api, `/ifc-files/${ifcFile.id}/viewer-geometry`, token);
  const backendGeometryMs = Date.now() - backendGeometryStarted;
  const targetGeometry = backendGeometry.elements.find((item) => item.global_id) ?? backendGeometry.elements[0];
  if (!targetGeometry) {
    throw new Error("Backend viewer geometry returned no target element.");
  }

  const auditFixture = await createAuditFixture(api, project.id, ifcFile.id, targetGeometry.entity, token);
  const failedResult =
    auditFixture.results.find((item) => item.element_guid === targetGeometry.global_id && item.status === "failed") ??
    auditFixture.results.find((item) => item.element_guid && item.status === "failed");
  const targetGlobalId = failedResult?.element_guid ?? targetGeometry.global_id;

  const browser = await chromium.launch({
    args: [
      "--disable-web-security",
      "--enable-webgl",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--js-flags=--expose-gc",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript((authToken) => {
    window.localStorage.setItem("valida-ifc-token", authToken);
  }, token);

  const loadStarted = Date.now();
  await page.goto(`${webBaseUrl}/visualizador?ifc_file_id=${ifcFile.id}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByRole("heading", { name: "Visualizador IFC" }).waitFor({ timeout: 120_000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes("Carregando malha IFC") && document.body.innerText.includes("Canvas"),
    undefined,
    { timeout: 600_000 },
  );
  const renderComplete = await page.waitForFunction(
    () => /Canvas\s+\d+(?:\/\d+)?\s+em\s+\d+\s+ms/.test(document.body.innerText),
    undefined,
    { timeout: 120_000 },
  ).then(() => true).catch(() => false);
  const loadAndRenderMs = Date.now() - loadStarted;
  await page.screenshot({ path: path.join(evidenceDir, `viewer-${index}-01-loaded.png`), fullPage: true });
  const loadedBody = await page.locator("body").innerText();
  const normalizedLoadedBody = loadedBody.replace(/\s+/g, " ");
  const loadedCanvasTextMatch = normalizedLoadedBody.match(
    /Canvas\s+([0-9]+(?:\/[0-9]+)?)(?:\s+em\s+(\d+)\s+ms)?/,
  );
  const loadedTriangleTextMatch = normalizedLoadedBody.match(/Triangulos\s+([0-9.]+)/);
  const idleFrames = await frameStats(page, 3_000);
  const heapAfterLoad = await heapStats(page);

  const canvas = page.locator("canvas").first();
  const canvasPresent = (await canvas.count()) > 0;
  let orbitFrames = null;
  let heapAfterOrbit = null;
  if (canvasPresent) {
    const box = await canvas.boundingBox();
    if (box) {
      const orbitFramesPromise = frameStats(page, 2_500);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.42, { steps: 24 });
      await page.mouse.move(box.x + box.width * 0.46, box.y + box.height * 0.56, { steps: 24 });
      await page.mouse.up();
      orbitFrames = await orbitFramesPromise;
      heapAfterOrbit = await heapStats(page);
    }
  }

  await page.locator('input[placeholder="ex: 2jHf..."]').fill(targetGlobalId);
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: path.join(evidenceDir, `viewer-${index}-02-globalid-filter.png`), fullPage: true });
  const bodyAfterGlobalId = await page.locator("body").innerText();
  const globalIdVisible = bodyAfterGlobalId.includes(targetGlobalId);

  let codeFilterEvidence = null;
  if (failedResult?.element_guid) {
    await page.getByLabel("Codigo do criterio").fill("PERF-GID-001");
    await page.waitForTimeout(1_500);
    const bodyAfterCode = await page.locator("body").innerText();
    const failureButton = page.locator("button", { hasText: failedResult.element_guid }).first();
    if (await failureButton.count()) {
      await failureButton.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(evidenceDir, `viewer-${index}-03-code-filter.png`), fullPage: true });
    codeFilterEvidence = {
      code: "PERF-GID-001",
      failed_global_id: failedResult.element_guid,
      code_visible: bodyAfterCode.includes("PERF-GID-001"),
      global_id_visible: bodyAfterCode.includes(failedResult.element_guid),
    };
  }

  const filterFramesPromise = frameStats(page, 2_500);
  await page.getByRole("button", { name: "Reprovado" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Reprovado" }).click();
  await page.waitForTimeout(400);
  const filterFrames = await filterFramesPromise;
  const heapAfterFilters = await heapStats(page);

  const body = await page.locator("body").innerText();
  const normalizedBody = body.replace(/\s+/g, " ");
  const loaderSource = body.includes("Loader browser")
    ? "web-ifc"
    : body.includes("Fallback backend") || body.includes("Geometria backend")
      ? "backend-fallback"
      : "unknown";
  const canvasTextMatch =
    loadedCanvasTextMatch ?? normalizedBody.match(/Canvas\s+([0-9]+(?:\/[0-9]+)?)(?:\s+em\s+(\d+)\s+ms)?/);
  const triangleTextMatch = loadedTriangleTextMatch ?? normalizedBody.match(/Triangulos\s+([0-9.]+)/);

  await browser.close();
  await api.dispose();

  return {
    ifc: {
      path: ifcPath,
      file_name: path.basename(ifcPath),
      size_mb: Math.round((fileStat.size / 1024 / 1024) * 100) / 100,
    },
    api: {
      project_id: project.id,
      ifc_file_id: ifcFile.id,
      backend_geometry_elements: backendGeometry.elements.length,
      backend_geometry_ms: backendGeometryMs,
      target_entity: targetGeometry.entity,
      target_global_id: targetGlobalId,
      audit_status: auditFixture.audit.status,
      audit_id: auditFixture.audit.id ?? null,
      failed_results: auditFixture.results.filter((item) => item.status === "failed" && item.element_guid).length,
    },
    viewer: {
      loader_source: loaderSource,
      canvas_present: canvasPresent,
      render_complete: renderComplete || Boolean(canvasTextMatch?.[2]),
      load_and_render_ms: loadAndRenderMs,
      canvas_counter: canvasTextMatch?.[1] ?? null,
      canvas_render_ms: canvasTextMatch?.[2] ? Number(canvasTextMatch[2]) : null,
      triangles_text: triangleTextMatch?.[1] ?? null,
      heap_after_load: heapAfterLoad,
      heap_after_orbit: heapAfterOrbit,
      heap_after_filters: heapAfterFilters,
      idle_frames: idleFrames,
      orbit_frames: orbitFrames,
      filter_frames: filterFrames,
      global_id_filter_visible: globalIdVisible,
      code_filter: codeFilterEvidence,
      console_errors: consoleErrors,
      page_errors: pageErrors,
    },
  };
}

await fs.mkdir(evidenceDir, { recursive: true });
const startedAt = new Date().toISOString();
const results = [];
for (let index = 0; index < ifcPaths.length; index += 1) {
  results.push(await runViewerMeasurement(ifcPaths[index], index + 1));
}

const payload = {
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  api_base_url: apiBaseUrl,
  web_base_url: webBaseUrl,
  results,
};

await fs.writeFile(path.join(evidenceDir, "viewer-performance-results.json"), JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
