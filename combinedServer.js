import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import dotenv from 'dotenv';
import { isLocalDemo } from './server/local-demo.js';
if (!isLocalDemo()) dotenv.config();
if (process.env.JWT_SECRET) console.log('JWT_SECRET loaded from environment');
else if (isLocalDemo()) console.log('JWT_SECRET not set, using a temporary secret for this local run');
else console.log('JWT_SECRET: MISSING');
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import postgresDb from './server/postgresDatabase.js';

import userRoutes from './server/api/routes/user.routes.js';
import matchRoutes from './server/api/routes/match.routes.js';
import leaderboardRoutes from './server/api/routes/leaderboard.routes.js';
import friendsRoutes from './server/api/routes/friends.routes.js';
import clanRoutes from './server/api/routes/clan.routes.js';
import statsRoutes from './server/api/routes/stats.routes.js';
import settingsRoutes from './server/api/routes/settings.routes.js';
import authRoutes from './server/api/routes/auth.routes.js';

import { GameRoom } from './src/game/server/GameRoom.js';
import { GAME_CONFIG } from './src/game/config/GameConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');
const DIST_INDEX_PATH = path.join(__dirname, 'dist', 'index.html');

function getNewestSourceMtimeMs(dirPath) {
    let newest = 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                newest = Math.max(newest, getNewestSourceMtimeMs(fullPath));
                continue;
            }
            if (!entry.isFile()) continue;

            if (!/\.(js|jsx|ts|tsx|css|scss|json)$/i.test(entry.name)) continue;
            const mtimeMs = fs.statSync(fullPath).mtimeMs;
            newest = Math.max(newest, mtimeMs);
        }
    } catch (error) {
        console.warn(`Failed to scan source timestamps in ${dirPath}:`, error.message);
    }
    return newest;
}

function warnIfFrontendBuildIsStale() {
    if (!fs.existsSync(DIST_INDEX_PATH)) {
        console.warn('Frontend build missing (`dist/index.html`). Run: npm run build');
        return;
    }

    const distMtimeMs = fs.statSync(DIST_INDEX_PATH).mtimeMs;
    const srcNewestMtimeMs = getNewestSourceMtimeMs(SRC_DIR);
    if (srcNewestMtimeMs > distMtimeMs + 1000) {
        const distTime = new Date(distMtimeMs).toLocaleString();
        const srcTime = new Date(srcNewestMtimeMs).toLocaleString();
        console.warn('Frontend build appears stale.');
        console.warn(`   dist/index.html: ${distTime}`);
        console.warn(`   newest src file: ${srcTime}`);
        console.warn('   Rebuild required: npm run build');
    }
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
    server,
    path: '/ws/game',
    maxPayload: 500 * 1024
});

const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGIN || false)
        : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
    req.sendToUser = (userId, type, payload) => {
        const socket = players.get(userId);
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type, payload }));
            console.log(`Notification sent to ${userId}: ${type}`);
            return true;
        }
        return false;
    };
    next();
});

console.log('Initializing PostgreSQL database...');
await postgresDb.init();
console.log('PostgreSQL database initialized successfully');

app.use('/api/auth', authRoutes);
app.use('/api/users', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'postgresql',
        websocket: 'active'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

if (!isLocalDemo()) warnIfFrontendBuildIsStale();

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
        const indexPath = path.resolve(__dirname, 'dist', 'index.html');

        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            console.error(`Index file missing at: ${indexPath}`);
            res.status(404).send('Frontend build not found. Please run: npm run build');
        }
    }
});

const rooms = new Map();
const players = new Map();
const physicsIntervalMs = 1000 / GAME_CONFIG.server.tickRate;

const performanceMetrics = {
    lastUpdate: performance.now(),
    frameCount: 0,
    fps: 0,
    physicsTime: 0,
    updateTime: 0,
    lastMetricsReset: performance.now()
};

const physicsLoop = setInterval(() => {
    const now = performance.now();

    const deltaTime = Math.min(now - performanceMetrics.lastUpdate, physicsIntervalMs * 2) / 1000;
    performanceMetrics.lastUpdate = now;
    performanceMetrics.frameCount++;

    if (now - performanceMetrics.lastMetricsReset >= 1000) {
        performanceMetrics.fps = performanceMetrics.frameCount;
        performanceMetrics.frameCount = 0;
        performanceMetrics.lastMetricsReset = now;
    }

    rooms.forEach(room => {
        if (room.status === 'in_game') {
            const physicsStart = performance.now();
            room.updatePhysics(deltaTime);
            performanceMetrics.physicsTime = performance.now() - physicsStart;
        }
    });
}, physicsIntervalMs);

const broadcastLoop = setInterval(() => {
    rooms.forEach(room => {
        if (room.status === 'in_game') {
            const updateStart = performance.now();
            room.broadcastState();
            performanceMetrics.updateTime = performance.now() - updateStart;
        }
    });
}, 1000 / GAME_CONFIG.server.broadcastRate);

wss.on('connection', (ws) => {
    console.log('New game client connected');

    let playerId = null;
    let playerName = null;

    ws.on('message', async (message) => {
        try {
            const { type, payload } = JSON.parse(message);

            switch (type) {
                case 'register':
                    playerId = payload.playerId;
                    playerName = payload.playerName;
                    players.set(playerId, ws);
                    console.log(`Player registered: ${playerName} (${playerId})`);

                    try {
                        const regUsername = extractUsernameFromPlayerId(playerId);
                        if (regUsername) {
                            await postgresDb.pool.query(
                                `UPDATE users SET status = 'online', last_active = NOW() WHERE LOWER(username) = LOWER($1)`,
                                [regUsername]
                            );
                        }
                    } catch (presenceErr) {
                        console.error('Failed to update presence on register:', presenceErr.message);
                    }

                    for (const [roomId, room] of rooms.entries()) {
                        if (room.isPlayerInGracePeriod(playerId)) {
                            console.log(`Player ${playerName} reconnecting to room ${roomId} (grace period active)`);
                            const reconnected = room.reconnectPlayer(playerId, ws);
                            if (reconnected === 'forfeit') {

                                console.log(`Player ${playerName} reconnected but forfeited (too much damage/time)`);
                                broadcastRoomsList();
                            } else if (reconnected) {
                                console.log(`Player ${playerName} successfully reconnected to room ${roomId}`);

                                ws.send(JSON.stringify({
                                    type: 'room_joined',
                                    payload: { room: room.toJSON(), reconnected: true }
                                }));

                                room.players.forEach(p => {
                                    if (p.id !== playerId) {
                                        const otherWs = room.sockets.get(p.id);
                                        if (otherWs && otherWs.readyState === 1) {
                                            otherWs.send(JSON.stringify({
                                                type: 'room_joined',
                                                payload: { room: room.toJSON(), reconnected: true }
                                            }));
                                        }
                                    }
                                });

                                startLoadingPhase(room);
                                broadcastRoomsList();
                            }
                            break;
                        }
                    }
                    break;

                case 'create_room':
                    await handleCreateRoom(playerId, playerName, payload, ws);
                    break;

                case 'join_room':
                    await handleJoinRoom(playerId, playerName, payload, ws);
                    break;

                case 'player_ready':
                    handlePlayerReady(playerId, payload, ws);
                    break;

                case 'loading_progress':
                    handleLoadingProgress(playerId, payload, ws);
                    break;

                case 'loading_complete':
                    handleLoadingComplete(playerId, payload, ws);
                    break;

                case 'input':
                    handleGameInput(playerId, payload, ws);
                    break;

                case 'fire':
                    handleFire(playerId, payload, ws);
                    break;

                case 'portal_travel':
                    handlePortalTravel(playerId, playerName, payload, ws);
                    break;

                case 'portal_beacon_place':
                    for (const room of rooms.values()) {
                        if (room.hasPlayer(playerId)) {
                            room.setBeaconState(playerId, payload.position);
                            room.broadcast('portal_beacon_placed', {
                                playerId, playerName,
                                position: payload.position,
                                timestamp: Date.now()
                            });
                            break;
                        }
                    }
                    break;

                case 'portal_beacon_recall':
                case 'portal_beacon_expire':
                case 'portal_beacon_used':
                    for (const room of rooms.values()) {
                        if (room.hasPlayer(playerId)) {
                            room.clearBeaconState(playerId);
                            room.broadcast('portal_beacon_removed', {
                                playerId, playerName,
                                reason: payload.type === 'portal_beacon_recall' ? 'recall' : payload.type === 'portal_beacon_expire' ? 'expire' : 'used',
                                timestamp: Date.now()
                            });
                            break;
                        }
                    }
                    break;

                case 'crystal_wall_deploy':
                    for (const room of rooms.values()) {
                        if (room.hasPlayer(playerId)) {
                            room.deployCrystalWall(playerId, payload.position, payload.rotation);
                            break;
                        }
                    }
                    break;

                case 'dodgeStart':
                case 'dodgeEnd':
                    for (const room of rooms.values()) {
                        if (room.hasPlayer(playerId)) {
                            room.setDashState(playerId, type === 'dodgeStart');
                            break;
                        }
                    }
                    break;

                case 'requestReplay':
                    handleRequestReplay(playerId, ws);
                    break;

                case 'claim_victory':
                    handleClaimVictory(playerId, ws);
                    break;

                case 'leave_room':
                    handleLeaveRoom(playerId, ws, payload);
                    break;

                case 'get_rooms':
                    broadcastRoomsList();
                    break;

                case 'invite_friend': {
                    const targetFriendId = payload.friendId;
                    let targetWs = null;

                    let senderRoomId = null;
                    const senderRooms = Array.from(rooms.values()).filter((room) => room.hasPlayer(playerId));
                    const preferredRoom = senderRooms.find((room) => room.status !== 'finished' && room.status !== 'cleaning');
                    if (preferredRoom) {
                        senderRoomId = preferredRoom.id;
                        const removedRooms = removePlayerFromRooms(playerId, { keepRoomId: senderRoomId });
                        if (removedRooms > 0) {
                            console.log(`Removed ${removedRooms} duplicate room membership(s) before invite_friend for ${playerName}`);
                            broadcastRoomsList();
                        }
                    }

                    if (!senderRoomId) {
                        const removedRooms = removePlayerFromRooms(playerId);
                        if (removedRooms > 0) {
                            console.log(`Removed ${removedRooms} stale room membership(s) before auto-create invite room for ${playerName}`);
                        }

                        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const room = new GameRoom(roomId, `${playerName}'s Game`, playerId, 2, { db: postgresDb });
                        room.onRoomEmpty = (id) => { rooms.delete(id); broadcastRoomsList(); console.log(`Room ${id} removed from rooms Map`); };
                        rooms.set(roomId, room);

                        const playerData = await buildPlayerData(playerId, playerName, payload);
                        const joined = room.addPlayer(playerData, ws);
                        if (joined) {
                            ws.send(JSON.stringify({
                                type: 'room_created',
                                payload: { room: room.toJSON() }
                            }));
                            broadcastRoomsList();
                            senderRoomId = roomId;
                            console.log(`Auto-created room ${roomId} for invite by ${playerName}`);
                        }
                    }

                    try {
                        const friendResult = await postgresDb.pool.query(
                            'SELECT username FROM users WHERE id = $1', [targetFriendId]
                        );
                        const friendUsername = friendResult.rows[0]?.username;

                        if (friendUsername) {
                            for (const [pid, pws] of players.entries()) {
                                if (pid.split('_')[0].toLowerCase() === friendUsername.toLowerCase() && pws.readyState === 1) {
                                    targetWs = pws;
                                    break;
                                }
                            }
                        }

                        if (targetWs && senderRoomId) {
                            targetWs.send(JSON.stringify({
                                type: 'game_invite_received',
                                payload: {
                                    fromPlayerId: playerId,
                                    fromPlayerName: playerName,
                                    roomId: senderRoomId,
                                    gameType: payload.gameType || 'multiplayer',
                                    message: payload.message || "Let's battle!"
                                }
                            }));
                            console.log(`Invite sent: ${playerName} → ${friendUsername} (room: ${senderRoomId})`);
                        } else if (!targetWs) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                payload: { message: 'Friend is not online' }
                            }));
                        }
                    } catch (inviteErr) {
                        console.error('Failed to process game invite:', inviteErr.message);
                    }
                    break;
                }

                case 'update_presence':

                    break;

                case 'load_friends': {
                    try {
                        if (!playerId) {
                            console.warn('load_friends: playerId is null — register first');
                            ws.send(JSON.stringify({ type: 'friends_list', payload: { friends: [] } }));
                            break;
                        }
                        const lfUsername = extractUsernameFromPlayerId(playerId) || playerId.split('_')[0];

                        const meResult = await postgresDb.pool.query(
                            `SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`, [lfUsername]
                        );
                        const meId = meResult.rows[0]?.id;
                        if (!meId) break;

                        const friendsResult = await postgresDb.pool.query(`
                            SELECT u.id, u.username, u.display_name, u.status, u.last_active,
                                   up.avatar, up.avatar_type, up.custom_avatar
                            FROM friends f
                            JOIN users u ON
                                (f.user_id = u.id AND f.friend_id = $1)
                                OR
                                (f.friend_id = u.id AND f.user_id = $1)
                            LEFT JOIN user_profiles up ON u.id = up.user_id
                            WHERE u.id != $1
                        `, [meId]);

                        const friendsList = friendsResult.rows.map(f => ({
                            ...f,
                            isOnline: [...players.keys()].some(pid => {
                                const pidName = extractUsernameFromPlayerId(pid) || pid.split('_')[0];
                                return pidName.toLowerCase() === f.username.toLowerCase();
                            })
                        }));

                        ws.send(JSON.stringify({
                            type: 'friends_list',
                            payload: { friends: friendsList }
                        }));
                    } catch (lfErr) {
                        console.error('Failed to load friends:', lfErr.message, lfErr.stack);
                        ws.send(JSON.stringify({
                            type: 'friends_list',
                            payload: { friends: [] }
                        }));
                    }
                    break;
                }

                default:
                    console.log(`Unknown message type: ${type}`);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', async (code, reasonBuffer) => {
        const reason = reasonBuffer ? reasonBuffer.toString() : '';
        console.log(`Player ${playerName} (${playerId}) disconnected [code=${code}${reason ? ` reason=${reason}` : ''}]`);

        let graceRoomId = null;
        if (playerId) {
            for (const [roomId, room] of rooms.entries()) {
                if (room.hasPlayer(playerId) && room.status === 'in_game') {

                    const result = room.removePlayer(playerId);
                    if (result === 'disconnected_grace') {
                        graceRoomId = roomId;
                        console.log(`Player ${playerName} in grace period (room ${roomId}) — keeping slot reserved`);
                    }
                    break;
                }
            }
        }

        if (graceRoomId) {
            removePlayerFromRooms(playerId, { keepRoomId: graceRoomId });
        } else {
            handleLeaveRoom(playerId, ws, { removeAll: true });
        }

        if (playerId) {
            players.delete(playerId);

            try {
                const dcUsername = extractUsernameFromPlayerId(playerId);
                if (dcUsername) {
                    const newStatus = graceRoomId ? 'away' : 'offline';
                    await postgresDb.pool.query(
                        `UPDATE users SET status = $1, last_active = NOW() WHERE LOWER(username) = LOWER($2)`,
                        [newStatus, dcUsername]
                    );
                }
            } catch (presenceErr) {
                console.error('Failed to update presence on disconnect:', presenceErr.message);
            }
        }
    });
});

const HEARTBEAT_INTERVAL = 30000;
const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
    clearInterval(heartbeatTimer);
    clearInterval(physicsLoop);
    clearInterval(broadcastLoop);
});

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
});

function extractUsernameFromPlayerId(playerId) {
    if (!playerId || typeof playerId !== 'string') return null;

    const canonicalMatch = playerId.match(/^(.*)_\d{10,}_[a-z0-9]+$/i);
    if (canonicalMatch && canonicalMatch[1]) {
        return canonicalMatch[1];
    }

    const first = playerId.split('_')[0];
    return first || null;
}

async function getUserIdFromPlayerId(playerId) {
    const username = extractUsernameFromPlayerId(playerId);
    if (!username) return null;

    try {
        const result = await postgresDb.pool.query(
            `SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
            [username]
        );
        return result.rows[0]?.id || null;
    } catch (error) {
        console.error(`Error resolving DB user ID for ${playerId}:`, error.message);
        return null;
    }
}

async function arePlayersFriends(playerIdA, playerIdB) {
    const usernameA = extractUsernameFromPlayerId(playerIdA);
    const usernameB = extractUsernameFromPlayerId(playerIdB);

    const [userIdA, userIdB] = await Promise.all([
        getUserIdFromPlayerId(playerIdA),
        getUserIdFromPlayerId(playerIdB)
    ]);

    if (!userIdA || !userIdB) {
        return false;
    }

    if (userIdA === userIdB) {
        return true;
    }

    try {
        const result = await postgresDb.pool.query(
            `SELECT 1
             FROM friends
             WHERE (user_id = $1 AND friend_id = $2)
                OR (user_id = $2 AND friend_id = $1)
             LIMIT 1`,
            [userIdA, userIdB]
        );

        const areFriends = result.rowCount > 0;
        return areFriends;
    } catch (error) {
        console.error(`Error checking friendship between ${playerIdA} and ${playerIdB}:`, error.message);
        return false;
    }
}

async function getUserProfile(playerId) {
    try {
        const username = extractUsernameFromPlayerId(playerId);
        if (!username) {
            return null;
        }

        const result = await postgresDb.pool.query(
            `SELECT u.id, u.username, u.display_name, u.status, u.last_active, u.wins, u.total_games,
                    up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message,
                    up.personal_banner, up.privacy_settings, up.avatar_type,
                    c.tag as clan_tag, c.name as clan_name
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             LEFT JOIN clans c ON u.clan_id = c.id
             WHERE LOWER(u.username) = LOWER($1)`,
            [username]
        );

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error fetching user profile for', playerId, ':', error.message);
        return null;
    }
}

function removePlayerFromRooms(playerId, options = {}) {
    const keepRoomId = options.keepRoomId || null;
    const broadcast = options.broadcast !== false;
    let removedCount = 0;

    for (const [roomId, room] of Array.from(rooms.entries())) {
        if (keepRoomId && roomId === keepRoomId) continue;
        if (!room.hasPlayer(playerId)) continue;

        room.removePlayer(playerId);
        removedCount += 1;

        if (room.isEmpty()) {
            rooms.delete(roomId);
        } else if (broadcast) {
            room.broadcast('player_left', { playerId });
        }
    }

    return removedCount;
}

async function handleCreateRoom(playerId, playerName, payload, ws) {
    const removedRooms = removePlayerFromRooms(playerId);
    if (removedRooms > 0) {
        console.log(`Removed ${removedRooms} stale room membership(s) before create_room for ${playerName}`);
        broadcastRoomsList();
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const roomOptions = { db: postgresDb };
    if (payload.seriesType) {
        roomOptions.seriesConfig = { type: payload.seriesType };
    }
    const room = new GameRoom(roomId, payload.name || 'New Room', playerId, payload.maxPlayers || 2, roomOptions);
    room.onRoomEmpty = (id) => { rooms.delete(id); broadcastRoomsList(); console.log(`Room ${id} removed from rooms Map`); };

    rooms.set(roomId, room);
    console.log(`Room created: ${room.name} (${roomId}) by ${playerName}, total: ${rooms.size}`);

    const playerData = await buildPlayerData(playerId, playerName, payload);
    const joined = room.addPlayer(playerData, ws);

    if (joined) {
        ws.send(JSON.stringify({
            type: 'room_created',
            payload: { room: room.toJSON() }
        }));
        broadcastRoomsList();
    }
}

async function handleJoinRoom(playerId, playerName, payload, ws) {
    const room = rooms.get(payload.roomId);
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Room not found' }
        }));
        return;
    }

    const removedRooms = removePlayerFromRooms(playerId, { keepRoomId: room.id });
    if (removedRooms > 0) {
        console.log(`Removed ${removedRooms} stale room membership(s) before join_room for ${playerName}`);
        broadcastRoomsList();
    }

    const playerData = await buildPlayerData(playerId, playerName, payload);
    const joined = room.addPlayer(playerData, ws);

    if (joined) {
        ws.send(JSON.stringify({
            type: 'room_joined',
            payload: { room: room.toJSON() }
        }));

        room.broadcast('player_joined', { newPlayer: playerData });

        if (room.players.length === room.maxPlayers) {
            ws.send(JSON.stringify({
                type: 'initial_state',
                payload: {
                    gameState: room.getState(),
                    playerId
                }
            }));
            startLoadingPhase(room);
        }

        broadcastRoomsList();
    }
}

async function buildPlayerData(playerId, playerName, payload) {
    let playerData;
    const userProfile = await getUserProfile(playerId);

    if (payload.profile) {
        const base = userProfile || {};
        const { id: dbUserId, ...baseProfile } = base;
        playerData = {
            ...baseProfile,
            db_user_id: dbUserId || null,
            id: playerId,
            name: playerName,
            ready: false,
            username: payload.profile.username || base.username,
            display_name: payload.profile.display_name || base.display_name,
            avatar_type: payload.profile.customization?.avatarType || base.avatar_type ||
                (payload.profile.customization?.customAvatar || base.custom_avatar ? 'custom' : 'preset'),
            theme: payload.profile.customization?.theme || base.theme,
            bio: payload.profile.customization?.bio || base.bio,
            status_message: payload.profile.customization?.status || base.status_message,
            custom_avatar: payload.profile.customization?.customAvatar || base.custom_avatar
        };
    } else if (userProfile) {
        const { id: dbUserId, ...baseProfile } = userProfile;
        playerData = {
            ...baseProfile,
            db_user_id: dbUserId || null,
            id: playerId,
            name: playerName,
            ready: false
        };
    } else {
        playerData = { id: playerId, name: playerName, ready: false };
    }

    if (playerData.custom_avatar && !playerData.avatar_type) {
        playerData.avatar_type = 'custom';
    }

    return playerData;
}

function handleGameInput(playerId, payload, ws) {

    for (const room of rooms.values()) {
        if (room.hasPlayer(playerId)) {
            room.handlePlayerInput(playerId, payload);
            break;
        }
    }
}

function handleFire(playerId, payload, ws) {

    for (const room of rooms.values()) {
        if (room.hasPlayer(playerId)) {
            room.handleFire(playerId, payload);
            break;
        }
    }
}

function handleRequestReplay(playerId, ws) {
    if (!playerId) return;
    for (const room of rooms.values()) {
        if (room.hasPlayer(playerId)) {
            room.handleReplayRequest(playerId);
            break;
        }
    }
}

function handleClaimVictory(playerId, ws) {
    if (!playerId) return;
    for (const room of rooms.values()) {
        if (room.hasPlayer(playerId)) {
            const claimed = room.claimVictory(playerId);
            if (claimed) {
                console.log(`${playerId} claimed victory via forfeit`);
            }
            break;
        }
    }
}

function handlePortalTravel(playerId, playerName, payload, ws) {
    if (!playerId) return;
    const data = payload?.data || payload || {};
    const isEntering = !!data.isEntering;
    const destination = data.destination || null;

    for (const room of rooms.values()) {
        if (room.hasPlayer(playerId)) {
            room.setPortalTravelState(playerId, isEntering);

            const type = isEntering ? 'portal_entry' : 'portal_exit';
            room.broadcast(type, {
                playerId,
                playerName: playerName || 'Unknown',
                fromPortal: 'player_portal',
                toPortal: 'player_portal',
                portal: 'player_portal',
                position: destination,
                timestamp: Date.now()
            });
            break;
        }
    }
}

function handlePlayerReady(playerId, payload, ws) {
    if (!playerId) return;
    for (const room of rooms.values()) {
        if (!room.hasPlayer(playerId)) continue;
        if (room.status === 'in_game') break;
        if (room.gamePhase !== 'ready') {

            ws?.send(JSON.stringify({
                type: 'ready_rejected',
                payload: {
                    reason: 'not_in_ready_phase',
                    gamePhase: room.gamePhase
                }
            }));
            break;
        }

        const loadingState = room.playerLoadingStates.get(playerId);
        if (!loadingState || loadingState.status !== 'complete') {
            ws?.send(JSON.stringify({
                type: 'ready_rejected',
                payload: {
                    reason: 'player_not_loaded',
                    loadingStatus: loadingState?.status || 'unknown'
                }
            }));
            break;
        }

        if (!room.checkAllPlayersLoaded()) {
            ws?.send(JSON.stringify({
                type: 'ready_rejected',
                payload: {
                    reason: 'waiting_for_all_players_loaded'
                }
            }));
            break;
        }

        const success = room.setPlayerReady(playerId);
        if (success) {
            room.broadcast('player_ready_update', {
                playerId,
                readyStates: Array.from(room.playerReadyStates.entries())
            });
        }
        break;
    }
}

function handleLoadingProgress(playerId, payload, ws) {
    if (!playerId) return;
    for (const room of rooms.values()) {
        if (!room.hasPlayer(playerId)) continue;
        if (room.gamePhase !== 'loading') break;

        const progress = typeof payload?.progress === 'number' ? payload.progress : 0;
        const step = payload?.step || 'Loading...';
        room.updatePlayerLoadingProgress(playerId, progress, step);
        break;
    }
}

function handleLoadingComplete(playerId, payload, ws) {
    if (!playerId) return;
    for (const room of rooms.values()) {
        if (!room.hasPlayer(playerId)) continue;
        if (room.gamePhase !== 'loading') {
            ws?.send(JSON.stringify({
                type: 'loading_rejected',
                payload: { reason: 'not_in_loading_phase' }
            }));
            break;
        }

        room.updatePlayerLoadingProgress(playerId, 100, 'Loading complete!');
        break;
    }
}

function startLoadingPhase(room) {
    if (!room || room.gamePhase === 'loading' || room.status === 'in_game') return;

    room.gamePhase = 'loading';
    room.loadingStartTime = Date.now();

    if (room.loadingTimeout) {
        clearTimeout(room.loadingTimeout);
    }
    room.loadingTimeout = setTimeout(() => {
        room.handleLoadingTimeout();
    }, 30000);

    room.players.forEach((player) => {
        const currentState = room.playerLoadingStates.get(player.id) || {};
        room.playerLoadingStates.set(player.id, {
            progress: 0,
            status: 'waiting',
            step: 'Starting to load game assets...',
            startTime: currentState.startTime || null
        });
    });

    room.broadcast('start_loading', {
        phase: 'loading',
        waitingFor: room.players.map((p) => ({
            playerId: p.id,
            playerName: p.name
        })),
        timeoutSeconds: 30,
        message: 'Loading game assets for all players...'
    });
}

function handleLeaveRoom(playerId, ws, payload = {}) {
    if (!playerId) return;

    const requestedRoomId = payload?.roomId || null;
    const removeAll = payload?.removeAll === true;
    const forceLeave = payload?.force === true;
    const source = payload?.source || (removeAll ? 'socket_close' : 'client');
    let removedCount = 0;

    let candidateRooms = Array.from(rooms.entries()).filter(([, room]) => room.hasPlayer(playerId));

    if (requestedRoomId) {
        candidateRooms = candidateRooms.filter(([roomId]) => roomId === requestedRoomId);
    } else if (!removeAll && candidateRooms.length > 1) {

        const preferred = candidateRooms.find(([, room]) => room.status !== 'finished' && room.status !== 'cleaning');
        candidateRooms = preferred ? [preferred] : [candidateRooms[0]];
    }

    for (const [roomId, room] of candidateRooms) {
        const inActiveGame = room.status === 'in_game';
        if (inActiveGame && !forceLeave && !removeAll) {
            console.warn(`Ignoring leave_room during active game: player=${playerId}, room=${roomId}, source=${source}`);
            continue;
        }

        console.log(`leave_room accepted: player=${playerId}, room=${roomId}, status=${room.status}, force=${forceLeave}, source=${source}`);
        room.removePlayer(playerId);
        removedCount += 1;

        if (room.isEmpty()) {
            rooms.delete(roomId);
        } else {
            room.broadcast('player_left', { playerId });
        }

        if (!removeAll) {
            break;
        }
    }

    if (removedCount > 0) {
        broadcastRoomsList();
    }
}

function broadcastRoomsList() {
    const roomsList = Array.from(rooms.values()).map(room => room.toJSON());

    const message = JSON.stringify({
        type: 'rooms_list',
        payload: { rooms: roomsList }
    });

    players.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(message);
        }
    });
}

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

server.listen(PORT, isLocalDemo() ? '127.0.0.1' : '0.0.0.0', () => {

    const interfaces = os.networkInterfaces();
    let networkIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                networkIp = iface.address;
                break;
            }
        }
    }

    console.log(`Combined Server running on port ${PORT}`);
    console.log(`API endpoints: http://localhost:${PORT}/api/*`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws/game`);
    if (!isLocalDemo()) {
        console.log(`Frontend (Local): http://localhost:${PORT}`);
        console.log(`Frontend (Network): http://${networkIp}:${PORT}`);
    }
});

export { app, server };
