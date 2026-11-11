import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateLocalDemo } from '../server/local-demo.js';

process.env.ASTRA_LOCAL_DEMO = '1';
process.env.DATABASE_URL ||= 'postgresql://astra_demo:localdemo@127.0.0.1:55440/astra_demo';

validateLocalDemo();
const keep = new Set(['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'TERM',
    'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'ComSpec', 'PATHEXT', 'DATABASE_URL', 'ASTRA_LOCAL_DEMO']);
for (const name of Object.keys(process.env)) if (!keep.has(name)) delete process.env[name];
process.env.NODE_ENV = 'development';
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';
process.env.ASTRA_DEMO_EMPTY_ENVDIR = mkdtempSync(join(tmpdir(), 'astra-demo-env-'));
process.on('exit', () => rmSync(process.env.ASTRA_DEMO_EMPTY_ENVDIR, { recursive: true, force: true }));
await import('../start-dev.js');
