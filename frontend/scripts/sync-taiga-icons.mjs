import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(scriptDir, '..');
const candidates = [
  join(frontendDir, '..', 'node_modules', '@taiga-ui', 'icons', 'src'),
  join(frontendDir, 'node_modules', '@taiga-ui', 'icons', 'src'),
];
const source = candidates.find((path) => existsSync(path));
const target = join(frontendDir, 'public', 'assets', 'taiga-ui', 'icons');

if (!source) {
  throw new Error('Cannot find @taiga-ui/icons package. Run npm install from the repository root.');
}

rmSync(target, { force: true, recursive: true });
cpSync(source, target, { recursive: true });
