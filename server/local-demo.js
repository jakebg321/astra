
export const isLocalDemo = () => process.env.ASTRA_LOCAL_DEMO === '1';

export function validateLocalDemo() {
    if (Object.keys(process.env).some((key) => /^PG[A-Z]/.test(key))) {
        throw new Error('Local demo refuses PostgreSQL environment overrides');
    }
    let url;
    try { url = new URL(process.env.DATABASE_URL); } catch {
        throw new Error('Local demo requires a valid local DATABASE_URL');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
        !['127.0.0.1', '[::1]'].includes(url.hostname) ||
        !url.port || url.username !== 'astra_demo' || url.pathname !== '/astra_demo' ||
        url.search || url.hash) {
        throw new Error('Local demo requires the dedicated astra_demo user and database on a loopback IP, with an explicit port and no URL parameters');
    }
}
