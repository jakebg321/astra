import './dns-fix.js';
import pkg from 'pg';
import dotenv from 'dotenv';
import { isLocalDemo, validateLocalDemo } from './local-demo.js';

if (!isLocalDemo()) dotenv.config();
if (isLocalDemo()) validateLocalDemo();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL environment variable is required');

const { Pool } = pkg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocalDemo() ? false : { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('Connected to PostgreSQL database'));
pool.on('error', (err) => console.error('PostgreSQL connection error:', err.message));

export default pool;
