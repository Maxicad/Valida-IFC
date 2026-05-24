import { expect, test } from "@playwright/test";

test("Google login completes Alfa onboarding and stores internal JWT", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to run Google login E2E.");

  await page.route("https://accounts.google.com/gsi/client", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.google = {
          accounts: {
            id: {
              initialize(config) {
                window.__validaGoogleCredentialCallback = config.callback;
              },
              renderButton(parent) {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = "Entrar com Google";
                button.addEventListener("click", () => {
                  window.__validaGoogleCredentialCallback({ credential: "fake-google-id-token" });
                });
                parent.appendChild(button);
              }
            }
          }
        };
      `,
    });
  });

  await page.route("**/auth/google", async (route) => {
    expect(route.request().method()).toBe("POST");
    const payload = route.request().postDataJSON() as { id_token: string };
    expect(payload.id_token).toBe("fake-google-id-token");
    await route.fulfill({
      contentType: "application/json",
      json: { access_token: "google-e2e-token", token_type: "bearer" },
    });
  });
  await page.route("**/projects", async (route) => {
    await route.fulfill({ contentType: "application/json", json: [] });
  });
  await page.route("**/criteria-sets", async (route) => {
    await route.fulfill({ contentType: "application/json", json: [] });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar com Google" }).click();

  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("valida-ifc-token"))).toBe("google-e2e-token");
  await expect(page).toHaveURL(/\/dashboard/);
});
