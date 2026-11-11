import { mergeConfig } from 'vite';
import base from '../vite.config.js';

if (!process.env.ASTRA_DEMO_EMPTY_ENVDIR) throw new Error('Use npm run demo to start the demo');
export default mergeConfig(base({ mode: 'development', command: 'serve' }), {

    envDir: process.env.ASTRA_DEMO_EMPTY_ENVDIR,
    server: { host: '127.0.0.1' }
});
