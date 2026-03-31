import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

async function waitForUrl(url: string): Promise<void> {
  const timeoutAt = Date.now() + 180_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await delay(2_000);
  }

  throw new Error(`Timeout while waiting for ${url}`);
}

export default async function globalSetup(): Promise<void> {
  execFileSync('docker', ['compose', 'up', '-d', '--build'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  await waitForUrl('http://127.0.0.1:8080/api/v1/profiles/mattoy');
  await waitForUrl('http://127.0.0.1:4200/login');
}
