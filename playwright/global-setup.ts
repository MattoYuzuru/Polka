import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

async function waitForUrl(url: string): Promise<void> {
  const timeoutAt = Date.now() + 180_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });

      if (response.ok) {
        return;
      }
    } catch {}

    await delay(2_000);
  }

  throw new Error(`Timeout while waiting for ${url}`);
}

export default async function globalSetup(): Promise<(() => void) | void> {
  const backendPort = process.env["BACKEND_PORT"] ?? "8080";
  const frontendPort = process.env["FRONTEND_PORT"] ?? "4200";

  const reuseStack = process.env["POLKA_REUSE_STACK"] === "1";
  const tearDown = () => {
    execFileSync("docker", ["compose", "down"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  };

  if (!reuseStack) {
    execFileSync("docker", ["compose", "up", "-d", "--build"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  }

  try {
    await waitForUrl(`http://127.0.0.1:${backendPort}/api/v1/health`);
    await waitForUrl(`http://127.0.0.1:${frontendPort}/login`);
  } catch (error) {
    if (!reuseStack) {
      tearDown();
    }

    throw error;
  }

  if (!reuseStack) {
    return tearDown;
  }
}
