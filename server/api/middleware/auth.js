import authService from '../../services/auth.service.js';

export const authenticateUser = async (req, res, next) => {
    try {

        let token = req.headers.authorization?.split(' ')[1];

        if (!token && req.cookies?.auth) {
            token = req.cookies.auth;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await authService.validateSession(token);
        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired session' });
    }
};
