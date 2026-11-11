import express from 'express';
import pool from '../../postgres.js';

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeframe = 'all' } = req.query;

        let timeFilter = '';
        if (timeframe === 'week') {
            timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        } else if (timeframe === 'month') {
            timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        }

        const userStats = await pool.query(`
            SELECT 
                wins,
                losses,
                total_games,
                current_win_streak,
                created_at
            FROM users 
            WHERE id = $1
        `, [userId]);

        if (userStats.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userStats.rows[0];

        const matchStats = await pool.query(`
            SELECT
                COUNT(*) as total_matches,
                SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner_id != $1 THEN 1 ELSE 0 END) as losses,
                SUM(duration) as total_playtime,
                AVG(duration) as avg_match_duration,
                MIN(CASE WHEN winner_id = $1 THEN duration ELSE NULL END) as fastest_win
            FROM matches
            WHERE (player1_id = $1 OR player2_id = $1) ${timeFilter}
        `, [userId]);

        const matches = matchStats.rows[0];

        const winRate = parseInt(matches.total_matches) > 0 ?
            (parseInt(matches.wins) / parseInt(matches.total_matches) * 100) : 0;

        const streakQuery = await pool.query(`
            WITH recent_matches AS (
                SELECT 
                    winner_id = $1 as is_win,
                    created_at
                FROM matches 
                WHERE (player1_id = $1 OR player2_id = $1)
                ORDER BY created_at DESC
                LIMIT 50
            ),
            streak_calc AS (
                SELECT 
                    is_win,
                    ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn,
                    SUM(CASE WHEN NOT is_win THEN 1 ELSE 0 END) 
                        OVER (ORDER BY created_at DESC ROWS UNBOUNDED PRECEDING) as loss_count
                FROM recent_matches
            )
            SELECT COUNT(*) as current_streak
            FROM streak_calc 
            WHERE is_win = true AND loss_count = 0
        `, [userId]);

        const currentStreak = streakQuery.rows[0]?.current_streak || 0;

        const bestStreakQuery = await pool.query(`
            WITH match_results AS (
                SELECT 
                    winner_id = $1 as is_win,
                    created_at,
                    LAG(winner_id = $1) OVER (ORDER BY created_at) as prev_win
                FROM matches 
                WHERE (player1_id = $1 OR player2_id = $1)
                ORDER BY created_at
            ),
            streak_groups AS (
                SELECT 
                    is_win,
                    SUM(CASE WHEN is_win != COALESCE(prev_win, false) THEN 1 ELSE 0 END) 
                        OVER (ORDER BY created_at) as streak_group
                FROM match_results
            ),
            streak_lengths AS (
                SELECT 
                    is_win,
                    COUNT(*) as streak_length
                FROM streak_groups 
                WHERE is_win = true
                GROUP BY streak_group, is_win
            )
            SELECT COALESCE(MAX(streak_length), 0) as best_streak
            FROM streak_lengths
        `, [userId]);

        const bestStreak = bestStreakQuery.rows[0]?.best_streak || 0;

        const matchTypeStats = await pool.query(`
            SELECT
                COALESCE(match_type, 'duel') as match_type,
                COUNT(*) as games,
                SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner_id != $1 THEN 1 ELSE 0 END) as losses
            FROM matches
            WHERE (player1_id = $1 OR player2_id = $1) ${timeFilter}
            GROUP BY match_type
        `, [userId]);

        const gameModes = {};
        matchTypeStats.rows.forEach(row => {
            gameModes[row.match_type] = {
                games: parseInt(row.games),
                wins: parseInt(row.wins),
                losses: parseInt(row.losses)
            };
        });

        let winTrend = 0;
        if (timeframe !== 'all') {
            const prevPeriodQuery = await pool.query(`
                SELECT COUNT(*) as prev_total_matches,
                       SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as prev_wins
                FROM matches 
                WHERE (player1_id = $1 OR player2_id = $1)
                AND created_at >= NOW() - INTERVAL '${timeframe === 'week' ? '14' : '60'} days'
                AND created_at < NOW() - INTERVAL '${timeframe === 'week' ? '7' : '30'} days'
            `, [userId]);

            const prevStats = prevPeriodQuery.rows[0];
            const prevWinRate = parseInt(prevStats.prev_total_matches) > 0 ? 
                (parseInt(prevStats.prev_wins) / parseInt(prevStats.prev_total_matches) * 100) : 0;
            const currentWinRate = parseInt(matches.total_matches) > 0 ? 
                (parseInt(matches.wins) / parseInt(matches.total_matches) * 100) : 0;
            
            winTrend = Math.round(currentWinRate - prevWinRate);
        }

        const result = {
            wins: parseInt(matches.wins) || 0,
            losses: parseInt(matches.losses) || 0,
            total_games: parseInt(matches.total_matches) || 0,
            current_win_streak: currentStreak,
            best_win_streak: bestStreak,
            total_playtime: parseInt(matches.total_playtime) || 0,
            average_match_duration: parseFloat(matches.avg_match_duration) || 0,
            fastest_win: parseInt(matches.fastest_win) || 0,
            win_rate: Math.round(winRate),
            win_trend: winTrend,
            game_modes: gameModes,
            member_since: user.created_at
        };

        res.json(result);

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 20, category = 'wins' } = req.query;

        let orderBy;
        switch (category) {
            case 'wins':
                orderBy = 'wins DESC';
                break;
            case 'winrate':
                orderBy = 'CASE WHEN total_games > 0 THEN (wins::float / total_games) ELSE 0 END DESC';
                break;
            case 'games':
                orderBy = 'total_games DESC';
                break;
            case 'streak':
                orderBy = 'current_win_streak DESC';
                break;
            default:
                orderBy = 'wins DESC';
        }

        const leaderboard = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.wins,
                u.losses,
                u.total_games,
                u.current_win_streak,
                CASE WHEN u.total_games > 0 THEN 
                    ROUND((u.wins::numeric / NULLIF(u.total_games, 0)::numeric) * 100, 1)
                ELSE 0 END as win_rate,
                u.created_at
            FROM users u
            WHERE u.total_games > 0
            ORDER BY ${orderBy}
            LIMIT $1
        `, [limit]);

        const rankedLeaderboard = leaderboard.rows.map((player, index) => ({
            ...player,
            rank: index + 1
        }));

        res.json(rankedLeaderboard);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

router.get('/compare/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;

        const [stats1Response, stats2Response] = await Promise.all([
            fetch(`${req.protocol}://${req.get('host')}/api/stats/user/${userId1}`),
            fetch(`${req.protocol}://${req.get('host')}/api/stats/user/${userId2}`)
        ]);

        const stats1 = await stats1Response.json();
        const stats2 = await stats2Response.json();

        const h2hQuery = await pool.query(`
            SELECT 
                COUNT(*) as total_matches,
                SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as user1_wins,
                SUM(CASE WHEN winner_id = $2 THEN 1 ELSE 0 END) as user2_wins
            FROM matches 
            WHERE (player1_id = $1 AND player2_id = $2) 
               OR (player1_id = $2 AND player2_id = $1)
        `, [userId1, userId2]);

        const headToHead = h2hQuery.rows[0];

        res.json({
            player1: stats1,
            player2: stats2,
            head_to_head: {
                total_matches: parseInt(headToHead.total_matches),
                player1_wins: parseInt(headToHead.user1_wins),
                player2_wins: parseInt(headToHead.user2_wins)
            }
        });

    } catch (error) {
        console.error('Error comparing player stats:', error);
        res.status(500).json({ error: 'Failed to compare player statistics' });
    }
});

export default router;
