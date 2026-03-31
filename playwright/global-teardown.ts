import { execFileSync } from 'node:child_process';

export default async function globalTeardown(): Promise<void> {
  execFileSync('docker', ['compose', 'down'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}
