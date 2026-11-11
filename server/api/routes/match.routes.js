import express from 'express';
import matchService from '../../services/match.service.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const matchData = req.body;

        if (!matchData.player1_id || !matchData.player2_id) {
            return res.status(400).json({ error: 'Player IDs are required' });
        }

        const result = await matchService.recordMatch(matchData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error recording match:', error);
        res.status(500).json({ error: 'Failed to record match' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const match = await matchService.getMatchById(id);
        
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        res.json(match);
    } catch (error) {
        console.error('Error fetching match:', error);
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const matches = await matchService.getRecentMatches(limit);
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

export default router;