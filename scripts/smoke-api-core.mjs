#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = (process.env.ASTRA_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_API_TIMEOUT_MS || '10000', 10);

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchJson(pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'application/json'
      }
    });

    const raw = await response.text();
    let json = null;
    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch (parseError) {
        throw new Error(`Invalid JSON for ${pathname}: ${raw.slice(0, 240)}`);
      }
    }

    return { response, json };
  } finally {
    clearTimeout(timeout);
  }
}

const checks = [
  {
    name: 'Health endpoint',
    path: '/api/health',
    validate: ({ response, json }) => {
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(json?.status === 'ok', 'Health status must be "ok"');
      ensure(json?.database === 'postgresql', 'Health database must be "postgresql"');
      ensure(json?.websocket === 'active', 'Health websocket must be "active"');
    }
  },
  {
    name: 'Clans listing endpoint',
    path: '/api/clans',
    validate: ({ response, json }) => {
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(Array.isArray(json), 'Clans response must be an array');
    }
  },
  {
    name: 'Friends endpoint shape',
    path: '/api/friends/1',
    validate: ({ response, json }) => {
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(json && typeof json === 'object', 'Friends response must be an object');
      ensure(Array.isArray(json.friends), 'Friends response must include "friends" array');
    }
  },
  {
    name: 'Stats leaderboard endpoint',
    path: '/api/stats/leaderboard?limit=5',
    validate: ({ response, json }) => {
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(Array.isArray(json), 'Leaderboard response must be an array');
    }
  },
  {
    name: 'User search endpoint',
    path: '/api/users/search?q=as',
    validate: ({ response, json }) => {
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(Array.isArray(json), 'User search response must be an array');
    }
  }
];

async function run() {
  console.log(`Running API smoke checks against ${BASE_URL}`);

  for (const check of checks) {
    const result = await fetchJson(check.path);
    check.validate(result);
    console.log(`${check.name}`);
  }

  console.log(`API smoke checks passed (${checks.length}/${checks.length})`);
}

run().catch((error) => {
  console.error(`API smoke checks failed: ${error.message}`);
  process.exit(1);
});
