import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  timeout: 120000,
  retries: 0,
  workers: 1,
  outputDir: "e2e/artifacts",
  reporter: [["list"]],
  use: {
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
