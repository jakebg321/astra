import express from 'express';
import authService from '../../services/auth.service.js';
import postgresDb from '../../postgresDatabase.js';
import { authenticateUser } from '../middleware/auth.js';

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

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _, -)' });
        }

        const existing = await postgresDb.getUser('username', username.toLowerCase());
        if (existing) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const userData = {
            username: username.toLowerCase(),
            display_name: username,
            password: password || null
        };

        const user = await postgresDb.createUser(userData);

        const token = await authService.generateToken({
            userId: user.id,
            username: user.username
        });

        setCookieToken(res, token);

        const fullUser = await postgresDb.getUser('id', user.id);
        res.status(201).json({
            success: true,
            user: fullUser,
            token
        });

        console.log(`New user registered: ${username}`);
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
            return res.status(400).json({ error: 'Username already in use' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.get('/me', authenticateUser, async (req, res) => {
    try {
        const user = await postgresDb.getUser('id', req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('auth', { path: '/' });
    res.json({ success: true });
});

export default router;
