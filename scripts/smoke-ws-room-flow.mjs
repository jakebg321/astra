#!/usr/bin/env node
import WebSocket from 'ws';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const WS_URL = process.env.ASTRA_WS_URL || 'ws://127.0.0.1:3001/ws/game';
const BASE_URL = (process.env.ASTRA_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const STEP_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_WS_TIMEOUT_MS || '15000', 10);
const verifyHistory = process.argv.includes('--verify-history');

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class SmokeClient {
  constructor(label, playerId, playerName, url) {
    this.label = label;
    this.playerId = playerId;
    this.playerName = playerName;
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.waiters = [];
    this.isClosing = false;
    this.lastServerError = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      let opened = false;
      const timeout = setTimeout(() => {
        if (opened) return;
        ws.terminate();
        reject(new Error(`${this.label} failed to connect within ${STEP_TIMEOUT_MS}ms`));
      }, STEP_TIMEOUT_MS);

      ws.once('open', () => {
        opened = true;
        clearTimeout(timeout);
        resolve();
      });

      ws.on('message', (raw) => {
        let message;
        try {
          message = JSON.parse(raw.toString());
        } catch (error) {
          this.rejectWaiters(new Error(`${this.label} received invalid JSON: ${raw.toString().slice(0, 240)}`));
          return;
        }

        this.messages.push(message);
        if (this.messages.length > 300) {
          this.messages.shift();
        }

        if (message.type === 'error') {
          this.lastServerError = message.payload?.message || 'Unknown server error';
        }

        this.resolveWaiters(message);
      });

      ws.once('error', (error) => {
        clearTimeout(timeout);
        if (!opened) {
          reject(new Error(`${this.label} socket error before connect: ${error.message}`));
          return;
        }
        this.rejectWaiters(new Error(`${this.label} socket error: ${error.message}`));
      });

      ws.once('close', () => {
        clearTimeout(timeout);
        if (!this.isClosing) {
          this.rejectWaiters(new Error(`${this.label} socket closed unexpectedly`));
        }
      });
    });
  }

  send(type, payload = {}) {
    ensure(this.ws && this.ws.readyState === WebSocket.OPEN, `${this.label} socket is not open`);
    this.ws.send(JSON.stringify({ type, payload }));
  }

  waitFor(type, predicate = () => true, timeoutMs = STEP_TIMEOUT_MS) {
    const existing = this.messages.find((message) => {
      return message.type === type && predicate(message.payload);
    });
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter !== waiterEntry);
        const seenTypes = [...new Set(this.messages.map((message) => message.type))];
        const serverError = this.lastServerError ? `; last server error: ${this.lastServerError}` : '';
        reject(new Error(`${this.label} timed out waiting for "${type}". Seen: [${seenTypes.join(', ')}]${serverError}`));
      }, timeoutMs);

      const waiterEntry = {
        matches: (message) => message.type === type && predicate(message.payload),
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      };

      this.waiters.push(waiterEntry);
    });
  }

  resolveWaiters(message) {
    const matchingWaiters = this.waiters.filter((waiter) => waiter.matches(message));
    if (matchingWaiters.length === 0) return;

    this.waiters = this.waiters.filter((waiter) => !matchingWaiters.includes(waiter));
    for (const waiter of matchingWaiters) {
      waiter.resolve(message);
    }
  }

  rejectWaiters(error) {
    if (this.waiters.length === 0) return;
    const pending = [...this.waiters];
    this.waiters = [];
    for (const waiter of pending) {
      waiter.reject(error);
    }
  }

  async close() {
    this.isClosing = true;
    if (!this.ws) return;

    if (this.ws.readyState === WebSocket.CLOSED) {
      return;
    }

    await new Promise((resolve) => {
      const onClose = () => resolve();
      this.ws.once('close', onClose);

      try {
        this.ws.close(1000, 'smoke_test_done');
      } catch {
        resolve();
      }

      setTimeout(() => {
        try {
          this.ws.terminate();
        } catch {

        }
        resolve();
      }, 1200);
    });
  }
}

async function registerProfile(username) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: randomBytes(16).toString('hex') }),
    signal: AbortSignal.timeout(STEP_TIMEOUT_MS)
  });
  ensure(response.status === 201, `Could not register ${username} (HTTP ${response.status})`);
}

async function verifySavedSeries(alpha, bravo, roomId) {
  bravo.send('leave_room', { roomId, force: true, source: 'smoke_test' });
  await alpha.waitFor('playerDisconnected', payload => payload?.playerId === bravo.playerId);
  alpha.send('claim_victory', {});
  const result = await alpha.waitFor('seriesEnd');
  ensure(result.payload?.winnerId === alpha.playerId, 'The remaining player did not win the series');

  const deadline = Date.now() + STEP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(`${BASE_URL}/api/users/${alpha.playerName}/history`, {
      signal: AbortSignal.timeout(STEP_TIMEOUT_MS)
    });
    ensure(response.ok, `Could not read match history (HTTP ${response.status})`);
    const history = await response.json();
    if (history.some(match => match.winner_name === alpha.playerName &&
        [match.player1_name, match.player2_name].includes(bravo.playerName))) return;
    await delay(100);
  }
  throw new Error('Finished series was missing from match history');
}

async function run() {
  const suffix = randomBytes(4).toString('hex');
  const runId = `${Date.now()}_${suffix}`;
  const alphaName = verifyHistory ? `smoke_a${suffix}` : 'smokea';
  const bravoName = verifyHistory ? `smoke_b${suffix}` : 'smokeb';
  const alpha = new SmokeClient('alpha', `${alphaName}_${runId}`, alphaName, WS_URL);
  const bravo = new SmokeClient('bravo', `${bravoName}_${runId}`, bravoName, WS_URL);

  try {
    if (verifyHistory) await Promise.all([registerProfile(alphaName), registerProfile(bravoName)]);
    console.log(`Connecting smoke clients to ${WS_URL}`);
    await Promise.all([alpha.connect(), bravo.connect()]);

    alpha.send('register', { playerId: alpha.playerId, playerName: alpha.playerName });
    bravo.send('register', { playerId: bravo.playerId, playerName: bravo.playerName });

    alpha.send('create_room', {
      name: `smoke-room-${runId}`,
      maxPlayers: 2,
      type: 'free',
      ...(verifyHistory && { seriesType: 'bo3' })
    });

    const roomCreated = await alpha.waitFor('room_created');
    const roomId = roomCreated.payload?.room?.id;
    ensure(typeof roomId === 'string' && roomId.length > 0, 'Missing room ID in room_created payload');

    bravo.send('join_room', { roomId });
    await bravo.waitFor('room_joined', (payload) => payload?.room?.id === roomId);

    await Promise.all([
      alpha.waitFor('start_loading'),
      bravo.waitFor('start_loading')
    ]);

    alpha.send('loading_complete', {});
    bravo.send('loading_complete', {});

    await Promise.all([
      alpha.waitFor('waiting_for_ready'),
      bravo.waitFor('waiting_for_ready')
    ]);

    alpha.send('player_ready', {});
    bravo.send('player_ready', {});

    const [alphaStarted, bravoStarted] = await Promise.all([
      alpha.waitFor('game_started'),
      bravo.waitFor('game_started')
    ]);

    ensure(alphaStarted.payload?.gameState?.status === 'in_game', 'alpha game_started payload missing in_game status');
    ensure(bravoStarted.payload?.gameState?.status === 'in_game', 'bravo game_started payload missing in_game status');

    if (verifyHistory) {
      await verifySavedSeries(alpha, bravo, roomId);
      console.log('Finished series and PostgreSQL match history verified');
    } else {
      bravo.send('leave_room', { roomId, force: true, source: 'smoke_test' });
    }
    alpha.send('leave_room', { roomId, force: true, source: 'smoke_test' });
    await delay(250);

    console.log('WebSocket room flow smoke checks passed');
  } finally {
    await Promise.allSettled([alpha.close(), bravo.close()]);
  }
}

run().catch((error) => {
  console.error(`WebSocket room flow smoke failed: ${error.message}`);
  process.exit(1);
});
