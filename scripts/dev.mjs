import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tjGenDir = path.resolve(rootDir, '../tj-gen');
const tjGenExists = fs.existsSync(tjGenDir);

async function askTarget() {
  if (!tjGenExists) {
    console.log('[dev] Local ../tj-gen not found; using live https://gen.teacherjake.com');
    return 'live';
  }

  if (!process.stdin.isTTY) {
    return 'local';
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(
      '\nSelect tj-gen backend for dev:\n  [1] Local (../tj-gen on http://localhost:3010)\n  [2] Live  (https://gen.teacherjake.com)\nChoice [1]: ',
      (input) => {
        rl.close();
        resolve(input.trim().toLowerCase());
      },
    );
  });

  if (answer === '2' || answer === 'live' || answer === 'prod') {
    return 'live';
  }
  return 'local';
}

const target = await askTarget();
const useLocal = target === 'local';
const tjGenPort = process.env.TJ_GEN_PORT || '3010';
const tjGenUrl = useLocal ? `http://localhost:${tjGenPort}` : 'https://gen.teacherjake.com';

console.log(`[dev] Using ${useLocal ? 'LOCAL' : 'LIVE'} tj-gen: ${tjGenUrl}\n`);

const viteBin = path.resolve(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
const viteArgs = process.argv.slice(2);

const child = spawn(viteBin, viteArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    USE_LOCAL_TJ_GEN: useLocal ? 'true' : 'false',
    VITE_TJ_GEN_URL: tjGenUrl,
  },
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
