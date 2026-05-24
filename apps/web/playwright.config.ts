import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");
const pythonPath = [
  repoRoot,
  path.join(repoRoot, "apps/api"),
  path.join(repoRoot, "packages/rules-engine"),
  path.join(repoRoot, "packages/ifc-utils"),
].join(path.delimiter);
const pythonCommand = process.env.E2E_PYTHON ? `"${process.env.E2E_PYTHON}"` : "python";
const useLocalApi = process.env.E2E_LOCAL_API === "1";
const apiBaseUrl = useLocalApi ? "http://127.0.0.1:8000" : "http://127.0.0.1:8001";
const composeCommand =
  "docker compose -f docker-compose.e2e.yml --project-name valida-ifc-e2e down -v --remove-orphans && " +
  "docker compose -f docker-compose.e2e.yml --project-name valida-ifc-e2e up --build --force-recreate --renew-anon-volumes api worker";

const apiWebServer = useLocalApi
  ? {
      command: `${pythonCommand} apps/api/scripts/init_e2e_db.py && ${pythonCommand} -m uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000`,
      cwd: repoRoot,
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        APP_ENV: "e2e",
        DATABASE_URL: "sqlite:///./.e2e/valida_ifc_e2e.sqlite3",
        LOCAL_STORAGE_PATH: "./.e2e/storage",
        JWT_SECRET_KEY: "e2e-secret",
        REDIS_URL: "redis://127.0.0.1:6379/0",
        CORS_ORIGINS: '["http://127.0.0.1:3100","http://localhost:3100"]',
        PYTHONPATH: pythonPath,
      },
    }
  : {
      command: composeCommand,
      cwd: repoRoot,
      url: apiBaseUrl + "/health",
      reuseExistingServer: false,
      timeout: 180_000,
    };

export default defineConfig({
  testDir: "./e2e",
  outputDir: "../../test-results/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../playwright-report", open: "never" }],
    ["json", { outputFile: "../../test-results/e2e/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: [
    apiWebServer,
    {
      command: "pnpm --dir apps/web dev -p 3100",
      cwd: repoRoot,
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      },
    },
  ],
});
