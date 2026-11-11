import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { isLocalDemo, validateLocalDemo } from './server/local-demo.js';

const demo = isLocalDemo();
if (demo) validateLocalDemo();
const children = new Set();
let stopping = false;
let childFailure = null;

function start(label, args, env = process.env) {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env });
    children.add(child);
    child.once('error', (error) => {
        childFailure = new Error(`${label}: ${error.message}`);
        if (!stopping) void shutdown(1);
    });
    child.once('exit', (code, signal) => {
        children.delete(child);
        if (!stopping) {
            childFailure = new Error(`${label} exited (${signal || code})`);
            console.error(childFailure.message);
            void shutdown(1);
        }
    });
    return child;
}

async function shutdown(code) {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
    const deadline = Date.now() + 3000;
    while (children.size && Date.now() < deadline) await delay(50);
    for (const child of children) child.kill('SIGKILL');
    process.exitCode = code;
}
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));

async function checkPort(port) {
    await new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', () => reject(new Error(`Port ${port} is unavailable`)));
        probe.listen(port, '127.0.0.1', () => probe.close(resolve));
    });
}

async function waitFor(url, label) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && !stopping) {
        if (childFailure) throw childFailure;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
            if (response.ok) return;
        } catch {   }
        await delay(200);
    }
    throw new Error(`${label} did not become ready`);
}

async function main() {
    try {
        await checkPort(3001);
        await checkPort(5173);
        start('Backend', ['combinedServer.js'], { ...process.env, NODE_ENV: 'development' });
        await waitFor('http://127.0.0.1:3001/health', 'Backend');
        if (demo) {
            const { ensureDemoAccount } = await import('./scripts/local-demo-account.mjs');
            await ensureDemoAccount();
        }
        const viteArgs = ['node_modules/vite/bin/vite.js'];
        if (demo) viteArgs.push('--config', 'scripts/local-demo-vite.config.js', '--host', '127.0.0.1');
        start('Frontend', viteArgs);
        await waitFor('http://127.0.0.1:5173/', 'Frontend');
        console.log('Astra is ready at http://127.0.0.1:5173/game');
    } catch (error) {
        console.error(`Startup failed: ${error.message}`);
        await shutdown(1);
    }
}

void main();
