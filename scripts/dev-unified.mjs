import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const EXPLORER_DIR = resolve(ROOT, 'cosmos', 'explorer');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

if (!existsSync(resolve(EXPLORER_DIR, 'node_modules'))) {
  console.log('[unified-dev] Installing cosmos/explorer dependencies...');
  execSync(`${npmCmd} ci --no-audit --no-fund`, { cwd: EXPLORER_DIR, stdio: 'inherit' });
}

console.log('[unified-dev] Starting Mahabishwo L0 (/) + COSMOS Explorer (/cosmos/) on http://localhost:3000 ...');

const children = [];

function startChild(label, command, args, cwd, extraEnv = {}) {
  const proc = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, ...extraEnv },
  });
  proc.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  children.push(proc);
  return proc;
}

startChild('cosmos-explorer', npmCmd, ['run', 'dev'], EXPLORER_DIR, {
  VITE_BASE: '/cosmos/',
});
startChild('mahabishwo-l0', npmCmd, ['run', 'dev:l0'], ROOT);

function shutdown() {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // ignore already exited children
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
