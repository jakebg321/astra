import pool from './postgres.js';
import bcrypt from 'bcryptjs';

class PostgresDatabase {
    constructor() {
        this.pool = pool;
    }

    async init() {
        try {

            const fs = await import('fs');
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
            await pool.query(migrationSQL);

            await pool.query(`
                ALTER TABLE user_profiles 
                ADD COLUMN IF NOT EXISTS custom_avatar TEXT,
                ADD COLUMN IF NOT EXISTS personal_banner TEXT,
                ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visible": true, "stats_visible": true}'::jsonb,
                ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(10) DEFAULT 'preset';
            `);

            console.log('Database migrations completed');
        } catch (error) {
            console.error('Database migration error:', error);
            throw error;
        }
    }

    async createUser(userData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { username, password, display_name } = userData;
            let password_hash = null;

            if (password) {
                password_hash = await bcrypt.hash(password, 10);
            }

            const userResult = await client.query(
                `INSERT INTO users (username, password_hash, display_name)
                 VALUES ($1, $2, $3) RETURNING id, username, display_name, status, wins, losses, total_games, current_win_streak, created_at`,
                [username, password_hash, display_name || username]
            );

            const user = userResult.rows[0];

            await client.query(
                `INSERT INTO user_profiles (user_id) VALUES ($1)`,
                [user.id]
            );

            await client.query('COMMIT');
            return user;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getUser(field, value) {
        const query = `
            SELECT u.id, u.username, u.display_name, u.status, u.wins, u.losses, u.total_games, u.current_win_streak, u.created_at,
                   up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, up.personal_banner, up.privacy_settings, up.avatar_type,
                   COALESCE(
                       json_agg(
                           CASE WHEN ua.achievement_id IS NOT NULL 
                           THEN ua.achievement_id END
                       ) FILTER (WHERE ua.achievement_id IS NOT NULL), 
                       '[]'::json
                   ) as achievements
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_achievements ua ON u.id = ua.user_id
            WHERE u.${field} = $1
            GROUP BY u.id, up.user_id, up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, up.personal_banner, up.privacy_settings, up.avatar_type
        `;

        const result = await pool.query(query, [value]);
        return result.rows[0] || null;
    }

    async getUserWithHash(field, value) {
        const query = `
            SELECT u.id, u.username, u.display_name, u.status, u.wins, u.losses, u.total_games, u.current_win_streak, u.created_at, u.password_hash
            FROM users u
            WHERE u.${field} = $1
        `;
        const result = await pool.query(query, [value]);
        return result.rows[0] || null;
    }

    async authenticateUser(username, password) {
        const userWithHash = await this.getUserWithHash('username', username);
        if (!userWithHash) return null;

        if (!userWithHash.password_hash) {

            const safeUser = await this.getUser('username', username);
            return safeUser;
        }

        const isValid = await bcrypt.compare(password, userWithHash.password_hash);
        if (!isValid) return null;

        const safeUser = await this.getUser('username', username);
        return safeUser;
    }

    async updateUser(id, updates) {
        console.log('updateUser called with id:', id, 'updates:', updates);

        const userFields = ['username', 'display_name', 'status', 'wins', 'losses', 'current_win_streak'];
        const profileFields = ['avatar', 'custom_avatar', 'bio', 'theme', 'status_message', 'personal_banner', 'privacy_settings', 'avatar_type'];

        const userUpdates = {};
        const profileUpdates = {};

        const normalizedUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            const lowerKey = key.toLowerCase();
            let normalizedKey = key;
            if (lowerKey === 'customavatar') normalizedKey = 'custom_avatar';
            if (lowerKey === 'avatartype') normalizedKey = 'avatar_type';
            if (lowerKey === 'custombanner') normalizedKey = 'personal_banner';
            if (lowerKey === 'status') normalizedKey = 'status_message';
            normalizedUpdates[normalizedKey] = value;
        }
        console.log('[CASE NORMALIZATION] Original vs Normalized:', {
            original: Object.keys(updates),
            normalized: Object.keys(normalizedUpdates)
        });

        for (const [key, value] of Object.entries(normalizedUpdates)) {
            if (key === 'customization' && typeof value === 'object') {

                if (value.avatar) profileUpdates.avatar = value.avatar;
                if (value.customAvatar) profileUpdates.custom_avatar = value.customAvatar;
                if (value.customBanner) profileUpdates.personal_banner = value.customBanner;
                if (value.bio !== undefined) profileUpdates.bio = value.bio;
                if (value.status !== undefined) profileUpdates.status_message = value.status;
                if (value.theme !== undefined) profileUpdates.theme = value.theme;
                if (value.avatarType !== undefined) profileUpdates.avatar_type = value.avatarType;
            } else if (userFields.includes(key)) {
                userUpdates[key] = value;
            } else if (profileFields.includes(key)) {
                profileUpdates[key] = value;
            }
        }

        if (profileUpdates.custom_avatar || normalizedUpdates.avatar === 'custom' ||
            profileUpdates.avatar_type === 'custom' ||
            normalizedUpdates.customization?.avatarType === 'custom') {
            profileUpdates.avatar_type = 'custom';
            console.log('Avatar type set to CUSTOM due to data presence');
        } else if (profileUpdates.avatar || normalizedUpdates.customization?.avatarType) {
            profileUpdates.avatar_type = 'preset';
            console.log('Avatar type set to PRESET');
        }

        console.log('userUpdates:', userUpdates);
        console.log('profileUpdates:', profileUpdates);
        console.log('[DEBUG] profileUpdates after inference:', profileUpdates);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let updatedUser = null;

            if (Object.keys(userUpdates).length > 0) {
                const setClause = Object.keys(userUpdates)
                    .map((key, index) => `${key} = $${index + 2}`)
                    .join(', ');

                const values = Object.values(userUpdates);

                const result = await client.query(
                    `UPDATE users SET ${setClause}, last_active = CURRENT_TIMESTAMP 
                     WHERE id = $1 RETURNING *`,
                    [id, ...values]
                );

                updatedUser = result.rows[0];
            }

            if (Object.keys(profileUpdates).length > 0) {
                console.log('Updating user_profiles for user:', id);
                const setClause = Object.keys(profileUpdates)
                    .map((key, index) => `${key} = $${index + 2}`)
                    .join(', ');

                const values = Object.values(profileUpdates);
                console.log('Profile update query:', `UPDATE user_profiles SET ${setClause} WHERE user_id = $1`);
                console.log('Profile update values (first 100 chars):', [id, ...values.map(v =>
                    typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v
                )]);

                await client.query(
                    `INSERT INTO user_profiles (user_id) VALUES ($1) 
                     ON CONFLICT (user_id) DO NOTHING`,
                    [id]
                );
                console.log('user_profiles record ensured for user:', id);

                await client.query(
                    `UPDATE user_profiles SET ${setClause} WHERE user_id = $1`,
                    [id, ...values]
                );
                console.log('user_profiles updated successfully for user:', id);
            }

            await client.query('COMMIT');
            console.log('Transaction committed successfully');

            console.log('Fetching updated user data for:', id);
            const finalUser = await this.getUser('id', id);
            console.log('Final user data retrieved:', finalUser ? 'success' : 'failed');
            return finalUser;

        } catch (error) {
            console.error('Database transaction error:', error);
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateUserStats(userId, statsUpdate) {
        const { wins, losses, currentWinStreak } = statsUpdate;

        const result = await pool.query(
            `UPDATE users 
             SET total_games = total_games + 1,
                 wins = COALESCE($2, wins),
                 losses = COALESCE($3, losses),
                 current_win_streak = COALESCE($4, current_win_streak)
             WHERE id = $1 RETURNING *`,
            [userId, wins, losses, currentWinStreak]
        );

        return result.rows[0];
    }

    async createMatch(matchData) {
        const { player1_id, player2_id, winner_id, match_type, duration } = matchData;

        const result = await pool.query(
            `INSERT INTO matches (player1_id, player2_id, winner_id, match_type, duration)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [player1_id, player2_id, winner_id, match_type, duration]
        );

        return result.rows[0];
    }

    async getUserMatches(userId, limit = 20) {
        const result = await pool.query(
            `SELECT m.*, 
                    u1.username as player1_name, 
                    u2.username as player2_name,
                    winner.username as winner_name
             FROM matches m
             LEFT JOIN users u1 ON m.player1_id = u1.id
             LEFT JOIN users u2 ON m.player2_id = u2.id
             LEFT JOIN users winner ON m.winner_id = winner.id
             WHERE m.player1_id = $1 OR m.player2_id = $1
             ORDER BY m.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    }

    async getLeaderboard(limit = 10, friendIds = null) {
        let query = `
            SELECT u.id, u.username, u.display_name, u.wins, u.total_games,
                   CASE WHEN u.total_games > 0 
                        THEN ROUND((u.wins::decimal / u.total_games) * 100, 1)
                        ELSE 0 END as win_rate,
                   up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, 
                   up.personal_banner, up.privacy_settings, up.avatar_type
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
        `;

        let values = [];

        if (friendIds && friendIds.length > 0) {
            query += ` WHERE id = ANY($1)`;
            values.push(friendIds);
        }

        query += ` ORDER BY wins DESC, win_rate DESC LIMIT $${values.length + 1}`;
        values.push(limit);

        const result = await pool.query(query, values);
        return result.rows;
    }

    async addFriend(userId, friendId) {

        const result = await pool.query(
            `INSERT INTO friendships (user1_id, user2_id, status)
             VALUES ($1, $2, 'pending') 
             ON CONFLICT (user1_id, user2_id) 
             DO NOTHING
             RETURNING *`,
            [userId, friendId]
        );

        return result.rows[0];
    }

    async getFriends(userId) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.status, u.last_active,
                    u.wins, u.total_games
             FROM friendships f
             JOIN users u ON (
                 CASE 
                     WHEN f.user1_id = $1 THEN u.id = f.user2_id
                     ELSE u.id = f.user1_id
                 END
             )
             WHERE (f.user1_id = $1 OR f.user2_id = $1) 
             AND f.status = 'accepted'
             ORDER BY u.last_active DESC`,
            [userId]
        );

        return result.rows;
    }

    async removeFriend(userId, friendId) {

        const [user1_id, user2_id] = userId < friendId ? [userId, friendId] : [friendId, userId];

        const result = await pool.query(
            `DELETE FROM friendships 
             WHERE user1_id = $1 AND user2_id = $2
             RETURNING *`,
            [user1_id, user2_id]
        );

        return result.rows[0];
    }

    async getFriendRequests(userId) {
        const result = await pool.query(
            `SELECT f.id, f.created_at, f.status,
                    u.id as user_id, u.username, u.display_name, u.status as user_status, 
                    u.last_active, u.wins, u.total_games
             FROM friendships f
             JOIN users u ON f.user1_id = u.id
             WHERE f.user2_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    async updateFriendshipStatus(userId, requestId, status) {
        const result = await pool.query(
            `UPDATE friendships 
             SET status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user2_id = $2
             RETURNING *`,
            [requestId, userId, status]
        );

        return result.rows[0];
    }

    async getUserByUsername(username) {
        const result = await pool.query(
            `SELECT * FROM users WHERE username = $1`,
            [username.toLowerCase()]
        );

        return result.rows[0];
    }

    async getFriendship(userId, friendId) {

        const [user1_id, user2_id] = userId < friendId ? [userId, friendId] : [friendId, userId];

        const result = await pool.query(
            `SELECT * FROM friendships 
             WHERE user1_id = $1 AND user2_id = $2`,
            [user1_id, user2_id]
        );

        return result.rows[0];
    }

    async unlockAchievement(userId, achievementId) {
        try {
            const result = await pool.query(
                `INSERT INTO user_achievements (user_id, achievement_id)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id, achievement_id) DO NOTHING
                 RETURNING *`,
                [userId, achievementId]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error unlocking achievement:', error);
            return null;
        }
    }

    async getUserAchievements(userId) {
        const result = await pool.query(
            `SELECT a.*, ua.unlocked_at
             FROM achievements a
             JOIN user_achievements ua ON a.id = ua.achievement_id
             WHERE ua.user_id = $1
             ORDER BY ua.unlocked_at DESC`,
            [userId]
        );

        return result.rows;
    }

    async searchUsers(query) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.status, u.last_active, u.wins, u.total_games,
                    up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, 
                    up.personal_banner, up.privacy_settings, up.avatar_type
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE u.username ILIKE $1 OR u.display_name ILIKE $1
             ORDER BY u.last_active DESC
             LIMIT 20`,
            [`%${query}%`]
        );

        return result.rows;
    }

    async getUserFriends(userId) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.status, u.last_active, 
                    u.wins, u.total_games, f.created_at as friend_since,
                    up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, 
                    up.personal_banner, up.privacy_settings, up.avatar_type
             FROM friends f
             JOIN users u ON f.friend_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE f.user_id = $1
             ORDER BY u.last_active DESC, f.created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    async getReceivedFriendRequests(userId) {
        const result = await pool.query(
            `SELECT fr.id, fr.created_at, fr.status,
                    u.id as from_user_id, u.username, u.display_name, 
                    u.status as user_status, u.last_active, u.wins, u.total_games,
                    up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, 
                    up.personal_banner, up.privacy_settings, up.avatar_type
             FROM friend_requests fr
             JOIN users u ON fr.from_user_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE fr.to_user_id = $1 AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );

        return result.rows.map(row => ({
            id: row.id,
            request_type: 'incoming',
            from_user: {
                id: row.from_user_id,
                username: row.username,
                display_name: row.display_name,
                status: row.user_status,
                last_active: row.last_active,
                wins: row.wins,
                total_games: row.total_games
            },
            created_at: row.created_at
        }));
    }

    async getSentFriendRequests(userId) {
        const result = await pool.query(
            `SELECT fr.id, fr.created_at, fr.status,
                    u.id as to_user_id, u.username, u.display_name, 
                    u.status as user_status, u.last_active, u.wins, u.total_games,
                    up.avatar, up.custom_avatar, up.bio, up.theme, up.status_message, 
                    up.personal_banner, up.privacy_settings, up.avatar_type
             FROM friend_requests fr
             JOIN users u ON fr.to_user_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE fr.from_user_id = $1 AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );

        return result.rows.map(row => ({
            id: row.id,
            request_type: 'outgoing',
            to_user: {
                id: row.to_user_id,
                username: row.username,
                display_name: row.display_name,
                status: row.user_status,
                last_active: row.last_active,
                wins: row.wins,
                total_games: row.total_games
            },
            created_at: row.created_at
        }));
    }

    async checkFriendship(userId1, userId2) {
        const result = await pool.query(
            `SELECT 1 FROM friends 
             WHERE (user_id = $1 AND friend_id = $2) 
                OR (user_id = $2 AND friend_id = $1)`,
            [userId1, userId2]
        );

        return result.rows.length > 0;
    }

    async checkFriendRequest(fromUserId, toUserId) {
        const result = await pool.query(
            `SELECT * FROM friend_requests 
             WHERE from_user_id = $1 AND to_user_id = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [fromUserId, toUserId]
        );

        return result.rows[0];
    }

    async createFriendRequest(fromUserId, toUserId) {
        const result = await pool.query(
            `INSERT INTO friend_requests (from_user_id, to_user_id) 
             VALUES ($1, $2) 
             RETURNING *`,
            [fromUserId, toUserId]
        );

        return result.rows[0];
    }

    async getFriendRequest(requestId) {
        const result = await pool.query(
            `SELECT * FROM friend_requests WHERE id = $1`,
            [requestId]
        );

        return result.rows[0];
    }

    async createFriendship(userId1, userId2) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)`,
                [userId1, userId2]
            );
            await client.query(
                `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)`,
                [userId2, userId1]
            );

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteFriendRequest(requestId) {
        const result = await pool.query(
            `DELETE FROM friend_requests 
             WHERE id = $1
             RETURNING *`,
            [requestId]
        );

        return result.rows[0];
    }

    async removeFriendship(userId, friendId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2`,
                [userId, friendId]
            );
            await client.query(
                `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2`,
                [friendId, userId]
            );

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new PostgresDatabase();
