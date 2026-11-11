import assert from 'node:assert/strict';
import { validateLocalDemo } from '../server/local-demo.js';

const savedEnv = { ...process.env };
const validUrl = 'postgresql://astra_demo:localdemo@127.0.0.1:55440/astra_demo';
function setEnv(extra = {}) {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, { ASTRA_LOCAL_DEMO: '1', DATABASE_URL: validUrl }, extra);
}
try {
    setEnv();
    assert.doesNotThrow(validateLocalDemo);
    for (const [name, values] of [
        ['remote database', { DATABASE_URL: 'postgresql://astra_demo:localdemo@example.com:55440/astra_demo' }],
        ['URL host override', { DATABASE_URL: `${validUrl}?host=example.com` }],
        ['other database', { DATABASE_URL: 'postgresql://astra_demo:localdemo@127.0.0.1:55440/production' }],
        ['Postgres override', { PGHOST: 'example.com' }]
    ]) {
        setEnv(values);
        assert.throws(validateLocalDemo, undefined, `${name} must be rejected`);
    }
    console.log('Local demo isolation checks passed');
} finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, savedEnv);
}
