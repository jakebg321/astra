import express from 'express';
import userService from '../../services/user.service.js';

const router = express.Router();

router.get('/global', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await userService.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

router.get('/friends/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const leaderboard = await userService.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching friends leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch friends leaderboard' });
    }
});

router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.getById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const stats = {
            id: user.id,
            username: user.username,
            total_games: user.total_games,
            wins: user.wins,
            losses: user.losses,
            win_rate: user.total_games > 0 ? ((user.wins / user.total_games) * 100).toFixed(1) : 0,
            current_win_streak: user.current_win_streak || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(500).json({ error: 'Failed to fetch player stats' });
    }
});

router.get('/head-to-head/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const stats = await userService.getHeadToHeadStats(userId1, userId2);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching head-to-head stats:', error);
        res.status(500).json({ error: 'Failed to fetch head-to-head stats' });
    }
});

export default router;