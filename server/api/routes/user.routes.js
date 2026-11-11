import express from 'express';
import userService from '../../services/user.service.js';
import authService from '../../services/auth.service.js';

const router = express.Router();

function setCookieToken(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
}

router.post('/auth', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await authService.authenticateUser(username, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.token) {
            setCookieToken(res, user.token);
        }

        res.json(user);
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const users = await userService.searchUsers(q);
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.getByUsername(username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

router.post('/', async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        if (error.message.includes('already')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create user profile' });
    }
});

router.patch('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.updateUserByUsername(username, req.body);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        if (error.message.includes('already')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

router.patch('/username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const user = await userService.updateUserByUsername(username, req.body);

        if (!user) {

            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        if (error.message.includes('already')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating user by username:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const available = await userService.isUsernameAvailable(username);
        res.json({ available });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check username availability' });
    }
});

router.get('/username/:username/history', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.getByUsername(username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const limit = parseInt(req.query.limit) || 20;
        const history = await userService.getMatchHistory(user.id, limit);
        res.json(history);
    } catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ error: 'Failed to fetch game history' });
    }
});

router.get('/:username/history', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.getByUsername(username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const limit = parseInt(req.query.limit) || 20;
        const history = await userService.getMatchHistory(user.id, limit);
        res.json(history);
    } catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ error: 'Failed to fetch game history' });
    }
});

export default router;
