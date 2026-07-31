import 'dotenv/config';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const SERVER_IP = process.env.DEPLOY_SERVER_IP;
const SERVER_USER = process.env.DEPLOY_SERVER_USER || 'root';
const REMOTE_HOOKS_PATH = process.env.POCKETBASE_HOOKS_PATH || '/opt/pocketbase/pb_hooks';
const SERVICE_NAME = process.env.DEPLOY_PB_SERVICE || 'pocketbase.service';
const HOOK_FILE = 'worksheets-deploy.pb.js';
const HELPER_FILES = ['worksheets-cloudflare-rebuild.js'];

const LOCAL_HOOK = join(projectRoot, 'pb_hooks', HOOK_FILE);

if (!SERVER_IP) {
    console.error('Error: DEPLOY_SERVER_IP is not set in .env');
    process.exit(1);
}

if (!existsSync(LOCAL_HOOK)) {
    console.error(`Error: hook file not found at ${LOCAL_HOOK}`);
    process.exit(1);
}

const sshTarget = `${SERVER_USER}@${SERVER_IP}`;
const remotePath = `${sshTarget}:${REMOTE_HOOKS_PATH}/${HOOK_FILE}`;

const sshOpts = [
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
];

function run(label, cmd, args) {
    console.log(`\n> ${label}`);
    console.log(`  $ ${cmd} ${args.join(' ')}`);
    try {
        execFileSync(cmd, args, { stdio: 'inherit' });
    } catch (err) {
        console.error(`\n${label} failed${err.status ? ` (exit ${err.status})` : ''}`);
        process.exit(err.status || 1);
    }
}

console.log(`Deploying PocketBase hook to ${sshTarget}`);
console.log(`  Local:  ${LOCAL_HOOK}`);
console.log(`  Remote: ${REMOTE_HOOKS_PATH}/${HOOK_FILE}`);

run('Copy hook', 'scp', [...sshOpts, LOCAL_HOOK, remotePath]);

for (const helper of HELPER_FILES) {
    const localHelper = join(projectRoot, 'pb_hooks', helper);
    if (!existsSync(localHelper)) {
        console.error(`\nError: helper file not found at ${localHelper}`);
        process.exit(1);
    }
    const remoteHelper = `${sshTarget}:${REMOTE_HOOKS_PATH}/${helper}`;
    console.log(`\n  Helper: ${localHelper} -> ${REMOTE_HOOKS_PATH}/${helper}`);
    run(`Copy helper ${helper}`, 'scp', [...sshOpts, localHelper, remoteHelper]);
}

run(`Restart ${SERVICE_NAME}`, 'ssh', [...sshOpts, sshTarget, `systemctl restart ${SERVICE_NAME}`]);

console.log('\nHook deployed and service restarted');
