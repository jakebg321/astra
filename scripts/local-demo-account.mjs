const credentials = { username: 'astra_demo', password: 'AstraLocal2026!' };

export async function ensureDemoAccount() {
    const base = 'http://127.0.0.1:3001';
    const request = (path) => fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    const registration = await request('/api/auth/register');
    if (registration.status !== 201 && registration.status !== 400) {
        throw new Error(`Could not create demo user (HTTP ${registration.status})`);
    }
    const login = await request('/api/users/auth');
    if (!login.ok) throw new Error(`Demo account login failed (HTTP ${login.status})`);
    console.log('Local demo account ready: astra_demo / AstraLocal2026!');
}
