import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "integration.spec.ts",
  timeout: 120000,
  workers: 1,
  use: {
    actionTimeout: 10000,
    baseURL: "http://127.0.0.1:3002",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: "npx tsx tests/fixtures/supabase-server.mts",
      url: "http://127.0.0.1:54329/health",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3002",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_local_integration_fixture",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3002",
      },
    },
  ],
  reporter: "list",
});
