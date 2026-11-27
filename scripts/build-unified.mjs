import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const EXPLORER_DIR = resolve(ROOT, 'cosmos', 'explorer');
const ROOT_DIST = resolve(ROOT, 'dist');
const EXPLORER_DIST = resolve(EXPLORER_DIR, 'dist');
const UNIFIED_COSMOS_DIST = resolve(ROOT_DIST, 'cosmos');

const skipExplorer = process.argv.includes('--skip-explorer');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function run(command, cwd, extraEnv = {}) {
  console.log(`[unified-build] > ${command} (cwd: ${cwd})`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
}

run(`${npmCmd} run build:l0`, ROOT);

if (!skipExplorer) {
  if (!existsSync(resolve(EXPLORER_DIR, 'node_modules'))) {
    console.log('[unified-build] cosmos/explorer/node_modules not found; installing dependencies...');
    run(`${npmCmd} ci --no-audit --no-fund`, EXPLORER_DIR);
  }
  run(`${npmCmd} run build`, EXPLORER_DIR, { VITE_BASE: '/cosmos/' });
  rmSync(UNIFIED_COSMOS_DIST, { recursive: true, force: true });
  cpSync(EXPLORER_DIST, UNIFIED_COSMOS_DIST, { recursive: true });
  console.log('[unified-build] Mounted COSMOS Explorer at dist/cosmos/ cleanly.');
}
