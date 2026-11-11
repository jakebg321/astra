import express from 'express';
import pool from '../../postgres.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                u.username as created_by_username,
                COUNT(cm.user_id) as member_count
            FROM clans c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            WHERE c.is_public = true
            GROUP BY c.id, u.username
            ORDER BY c.level DESC, c.xp DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clans:', error);
        res.status(500).json({ error: 'Failed to fetch clans' });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(`
            SELECT 
                c.*,
                u.username as created_by_username,
                COUNT(cm.user_id) as member_count
            FROM clan_members cm_user
            JOIN clans c ON cm_user.clan_id = c.id
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            WHERE cm_user.user_id = $1
            GROUP BY c.id, u.username
        `, [userId]);

        if (result.rows.length === 0) {
            return res.json(null);
        }

        const clan = result.rows[0];

        const membersResult = await pool.query(`
            SELECT 
                cm.*,
                u.username,
                u.display_name,
                u.wins,
                u.losses,
                u.total_games
            FROM clan_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.clan_id = $1
            ORDER BY 
                CASE cm.role 
                    WHEN 'leader' THEN 1 
                    WHEN 'officer' THEN 2 
                    ELSE 3 
                END,
                cm.contribution_xp DESC
        `, [clan.id]);

        clan.members = membersResult.rows;
        res.json(clan);
    } catch (error) {
        console.error('Error fetching user clan:', error);
        res.status(500).json({ error: 'Failed to fetch user clan' });
    }
});

router.get('/:clanId', async (req, res) => {
    try {
        const { clanId } = req.params;

        const clanResult = await pool.query(`
            SELECT 
                c.*,
                u.username as created_by_username,
                COUNT(cm.user_id) as member_count
            FROM clans c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            WHERE c.id = $1
            GROUP BY c.id, u.username
        `, [clanId]);

        if (clanResult.rows.length === 0) {
            return res.status(404).json({ error: 'Clan not found' });
        }

        const membersResult = await pool.query(`
            SELECT 
                cm.*,
                u.username,
                u.display_name,
                u.wins,
                u.losses,
                u.total_games
            FROM clan_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.clan_id = $1
            ORDER BY 
                CASE cm.role 
                    WHEN 'leader' THEN 1 
                    WHEN 'officer' THEN 2 
                    ELSE 3 
                END,
                cm.contribution_xp DESC
        `, [clanId]);

        const clan = clanResult.rows[0];
        clan.members = membersResult.rows;

        res.json(clan);
    } catch (error) {
        console.error('Error fetching clan:', error);
        res.status(500).json({ error: 'Failed to fetch clan' });
    }
});

router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { name, tag, description, bannerData, userId, isPublic, maxMembers } = req.body;

        if (!name || !tag || !userId) {
            return res.status(400).json({ error: 'Name, tag, and user ID are required' });
        }

        if (tag.length > 8) {
            return res.status(400).json({ error: 'Clan tag must be 8 characters or less' });
        }

        const userCheck = await client.query('SELECT clan_id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows[0]?.clan_id) {
            return res.status(400).json({ error: 'User is already in a clan' });
        }

        const clanResult = await client.query(`
            INSERT INTO clans (name, tag, description, banner_data, created_by, is_public, max_members)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, tag, description, bannerData || null, userId, isPublic !== undefined ? isPublic : true, maxMembers || 50]);

        const clan = clanResult.rows[0];

        await client.query(`
            INSERT INTO clan_members (clan_id, user_id, role)
            VALUES ($1, $2, 'leader')
        `, [clan.id, userId]);

        await client.query(`
            UPDATE users 
            SET clan_id = $1, clan_role = 'leader', clan_joined_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [clan.id, userId]);

        await client.query(`
            INSERT INTO clan_activity_log (clan_id, user_id, action, details)
            VALUES ($1, $2, 'created', $3)
        `, [clan.id, userId, JSON.stringify({ clanName: name, clanTag: tag })]);

        await client.query('COMMIT');
        res.status(201).json(clan);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating clan:', error);
        if (error.constraint === 'clans_name_key') {
            res.status(400).json({ error: 'Clan name already exists' });
        } else if (error.constraint === 'clans_tag_key') {
            res.status(400).json({ error: 'Clan tag already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create clan' });
        }
    } finally {
        client.release();
    }
});

router.post('/:clanId/join', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { clanId } = req.params;
        const { userId } = req.body;

        const clanResult = await client.query(`
            SELECT * FROM clans WHERE id = $1 AND is_public = true
        `, [clanId]);

        if (clanResult.rows.length === 0) {
            return res.status(404).json({ error: 'Clan not found or not public' });
        }

        const clan = clanResult.rows[0];

        const userCheck = await client.query('SELECT clan_id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows[0]?.clan_id) {
            return res.status(400).json({ error: 'User is already in a clan' });
        }

        const memberCount = await client.query(`
            SELECT COUNT(*) FROM clan_members WHERE clan_id = $1
        `, [clanId]);

        if (parseInt(memberCount.rows[0].count) >= clan.max_members) {
            return res.status(400).json({ error: 'Clan is full' });
        }

        await client.query(`
            INSERT INTO clan_members (clan_id, user_id, role)
            VALUES ($1, $2, 'member')
        `, [clanId, userId]);

        await client.query(`
            UPDATE users 
            SET clan_id = $1, clan_role = 'member', clan_joined_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [clanId, userId]);

        const userResult = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        await client.query(`
            INSERT INTO clan_activity_log (clan_id, user_id, action, details)
            VALUES ($1, $2, 'joined', $3)
        `, [clanId, userId, JSON.stringify({ username: userResult.rows[0].username })]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Successfully joined clan' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error joining clan:', error);
        res.status(500).json({ error: 'Failed to join clan' });
    } finally {
        client.release();
    }
});

router.post('/:clanId/leave', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { clanId } = req.params;
        const { userId } = req.body;

        const memberCheck = await client.query(`
            SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2
        `, [clanId, userId]);

        if (memberCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User is not in this clan' });
        }

        const userRole = memberCheck.rows[0].role;

        if (userRole === 'leader') {
            const memberCount = await client.query(`
                SELECT COUNT(*) FROM clan_members WHERE clan_id = $1
            `, [clanId]);

            if (parseInt(memberCount.rows[0].count) > 1) {

                await client.query(`
                    UPDATE clan_members 
                    SET role = 'leader'
                    WHERE clan_id = $1 AND user_id = (
                        SELECT user_id FROM clan_members 
                        WHERE clan_id = $1 AND user_id != $2
                        ORDER BY 
                            CASE role WHEN 'officer' THEN 1 ELSE 2 END,
                            joined_at ASC
                        LIMIT 1
                    )
                `, [clanId, userId]);
            } else {

                await client.query('DELETE FROM clans WHERE id = $1', [clanId]);
            }
        }

        await client.query(`
            DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2
        `, [clanId, userId]);

        await client.query(`
            UPDATE users 
            SET clan_id = NULL, clan_role = NULL, clan_joined_at = NULL
            WHERE id = $1
        `, [userId]);

        const userResult = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        await client.query(`
            INSERT INTO clan_activity_log (clan_id, user_id, action, details)
            VALUES ($1, $2, 'left', $3)
        `, [clanId, userId, JSON.stringify({ username: userResult.rows[0].username })]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Successfully left clan' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error leaving clan:', error);
        res.status(500).json({ error: 'Failed to leave clan' });
    } finally {
        client.release();
    }
});

router.get('/:clanId/chat', async (req, res) => {
    try {
        const { clanId } = req.params;
        const { limit = 50 } = req.query;

        const result = await pool.query(`
            SELECT 
                cc.*,
                u.username,
                u.display_name,
                cm.role as clan_role
            FROM clan_chat cc
            JOIN users u ON cc.user_id = u.id
            LEFT JOIN clan_members cm ON cc.clan_id = cm.clan_id AND cc.user_id = cm.user_id
            WHERE cc.clan_id = $1
            ORDER BY cc.created_at DESC
            LIMIT $2
        `, [clanId, limit]);

        res.json(result.rows.reverse());
    } catch (error) {
        console.error('Error fetching clan chat:', error);
        res.status(500).json({ error: 'Failed to fetch clan chat' });
    }
});

router.post('/:clanId/chat', async (req, res) => {
    try {
        const { clanId } = req.params;
        const { userId, message, messageType = 'text' } = req.body;

        const memberCheck = await pool.query(`
            SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2
        `, [clanId, userId]);

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'User is not in this clan' });
        }

        const result = await pool.query(`
            INSERT INTO clan_chat (clan_id, user_id, message, message_type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [clanId, userId, message, messageType]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error sending clan chat message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.get('/:clanId/wars', async (req, res) => {
    try {
        const { clanId } = req.params;

        const result = await pool.query(`
            SELECT 
                cw.*,
                c1.name as challenger_name,
                c1.tag as challenger_tag,
                c2.name as defender_name,
                c2.tag as defender_tag,
                w.name as winner_name,
                w.tag as winner_tag
            FROM clan_wars cw
            LEFT JOIN clans c1 ON cw.challenger_clan = c1.id
            LEFT JOIN clans c2 ON cw.defender_clan = c2.id
            LEFT JOIN clans w ON cw.winner_clan = w.id
            WHERE cw.challenger_clan = $1 OR cw.defender_clan = $1
            ORDER BY cw.created_at DESC
        `, [clanId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clan wars:', error);
        res.status(500).json({ error: 'Failed to fetch clan wars' });
    }
});

router.post('/:clanId/challenge/:targetClanId', async (req, res) => {
    try {
        const { clanId, targetClanId } = req.params;
        const { userId, warType = 'standard' } = req.body;

        const memberCheck = await pool.query(`
            SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2
        `, [clanId, userId]);

        if (memberCheck.rows.length === 0 ||
            !['leader', 'officer'].includes(memberCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const result = await pool.query(`
            INSERT INTO clan_wars (challenger_clan, defender_clan, war_type)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [clanId, targetClanId, warType]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating clan war:', error);
        res.status(500).json({ error: 'Failed to create clan war' });
    }
});

router.put('/:clanId/banner', async (req, res) => {
    try {
        const { clanId } = req.params;
        const { userId, bannerData } = req.body;

        const memberCheck = await pool.query(`
            SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2
        `, [clanId, userId]);

        if (memberCheck.rows.length === 0 ||
            !['leader', 'officer'].includes(memberCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const result = await pool.query(`
            UPDATE clans SET banner_data = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [bannerData, clanId]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating clan banner:', error);
        res.status(500).json({ error: 'Failed to update banner' });
    }
});

export default router;