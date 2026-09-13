import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

export interface AppFixture {
  baseURL: string;
  consoleErrors: string[];
  mode: "live" | "offline";
}

export const CONSOLE_ALLOWLIST: RegExp[] = [
  /ResizeObserver loop completed with undelivered notifications/,
  /Failed to load resource: .*\/favicon\.ico/,
  /Failed to load resource/,
];

interface FixtureOptions {
  baseURL?: string;
}

async function waitForHealth(baseURL: string): Promise<void> {
  const deadline: number = Date.now() + 60000;
  let lastBody = "";
  while (Date.now() < deadline) {
    try {
      const res: Response = await fetch(`${baseURL}/healthz`);
      lastBody = await res.text();
      if (res.ok) return;
    } catch (e: unknown) {
      lastBody = e instanceof Error ? e.message : String(e);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server not healthy: ${lastBody}`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port: number = typeof addr === "object" && addr !== null ? (addr as { port: number }).port : 0;
      server.close((err?: Error) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

export const test = base.extend<{ app: AppFixture }>({
  app: async ({ page }: { page: Page }, use: (app: AppFixture) => Promise<void>) => {
    const remoteBase: string | undefined = process.env["BASE_URL"];
    const consoleErrors: string[] = [];
    if (remoteBase !== undefined && remoteBase !== "") {
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text: string = msg.text();
          if (!CONSOLE_ALLOWLIST.some((re) => re.test(text))) {
            consoleErrors.push(text);
          }
        }
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(String(err));
      });
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem("rz-theme", "light");
        } catch {
          // ignore
        }
      });
      await use({ baseURL: remoteBase, consoleErrors, mode: "live" });
      expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
      return;
    }
    const port: number = await freePort();
    const baseURL = `http://127.0.0.1:${port}`;
    const child: ChildProcess = spawn(
      process.execPath,
      ["node_modules/.pnpm/vite-node@6.0.0_@types+node@26.4.1/node_modules/vite-node/dist/cli.mjs", "scripts/serve.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(port), RES_FORCED_DEGRADED: "1" },
        stdio: "pipe",
        shell: false,
      },
    );
    const childOutput: string[] = [];
    child.stdout?.on("data", (d: Buffer) => childOutput.push(String(d)));
    child.stderr?.on("data", (d: Buffer) => childOutput.push(String(d)));
    try {
      await waitForHealth(baseURL);
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text: string = msg.text();
          if (!CONSOLE_ALLOWLIST.some((re) => re.test(text))) {
            consoleErrors.push(text);
          }
        }
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(String(err));
      });
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem("rz-theme", "light");
        } catch {
          // ignore
        }
      });
      await use({ baseURL, consoleErrors, mode: "offline" });
      expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
      void childOutput;
    } finally {
      child.kill();
    }
  },
});

export { expect };
export type { FixtureOptions };
