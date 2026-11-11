import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const base = (process.env.ASTRA_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

async function request(path, { token, body, method = 'GET', status = 200 } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + path, {
        method, headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });
    assert.equal(response.status, status, `${method} ${path}`);
    return response.json();
}

async function register() {
    return request('/api/auth/register', {
        method: 'POST', status: 201,
        body: {
            username: `settings_${randomBytes(4).toString('hex')}`,
            password: randomBytes(16).toString('hex')
        }
    });
}

const path = '/api/users/settings';
await request(path, { status: 401 });
const [alpha, beta] = await Promise.all([register(), register()]);
const transform = { position: { x: 1.5, y: 0, z: -2 } };
const update = await request(path, {
    token: alpha.token, method: 'PUT',
    body: { bullet_style: 3, invert_y: true, cockpit_transform: transform }
});
assert.equal(update.settings.bullet_style, 3);
assert.deepEqual(update.settings.cockpit_transform, transform);
const saved = await request(path, { token: alpha.token });
assert.equal(saved.settings.invert_y, true);
assert.deepEqual(saved.settings.cockpit_transform, transform);
const concurrent = await Promise.all(Array.from({ length: 3 }, () => request(path, { token: beta.token })));
assert(concurrent.every(result => result.settings.user_id === beta.user.id));
await request(path, {
    token: beta.token, method: 'PUT', body: { user_id: alpha.user.id, bullet_style: 4 }
});
assert.equal((await request(path, { token: alpha.token })).settings.bullet_style, 3);
await request(`${path}/migrate`, {
    token: alpha.token, method: 'POST',
    body: { localStorageData: { mouseSensitivity: 0.004, radarCalibrations: [{ x: 2 }], invertY: false } }
});
const migrated = (await request(path, { token: alpha.token })).settings;
assert.equal(Number(migrated.mouse_sensitivity), 0.004);
assert.equal(migrated.invert_y, false);
assert.deepEqual(migrated.radar_calibrations, [{ x: 2 }]);
const bulk = await request(`${path}/bulk`, {
    token: alpha.token, method: 'POST', body: { userIds: [alpha.user.id, beta.user.id] }
});
assert.equal(bulk.settings.length, 2);
assert.equal(bulk.settings.find(row => row.user_id === beta.user.id).bullet_style, 4);
await request(path, { token: alpha.token, method: 'PUT', body: { cockpit_transform: null } });
assert.equal((await request(path, { token: alpha.token })).settings.cockpit_transform, null);
await request(path, { token: alpha.token, method: 'DELETE' });
assert.equal((await request(path, { token: alpha.token })).settings.bullet_style, 2);
const banner = JSON.stringify({ version: '7.4.0', objects: [] });
await request(`/api/users/username/${alpha.user.username}`, {
    token: alpha.token, method: 'PATCH', body: { personal_banner: banner }
});
const storedBanner = (await request(`/api/users/${alpha.user.username}`)).personal_banner;
assert.deepEqual(typeof storedBanner === 'string' ? JSON.parse(storedBanner) : storedBanner, JSON.parse(banner));
console.log('Settings smoke checks passed: authentication, creation, persistence, JSON, migration, bulk lookup, isolation, reset, and banner persistence');
