import { defineConfig } from "@playwright/test";

const frontendPort = process.env["FRONTEND_PORT"] ?? "4200";
const chromiumExecutablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];

export default defineConfig({
  testDir: "./playwright/tests",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
  },
  globalSetup: "./playwright/global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
