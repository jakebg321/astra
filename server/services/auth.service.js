import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import postgresDb from '../postgresDatabase.js';

class AuthService {
    constructor() {
        this._jwtSecret = null;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        this.jwtIssuer = 'astra-app';
    }

    get jwtSecret() {
        if (!this._jwtSecret) {
            this._jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || '';
            if (!this._jwtSecret) {
                this._jwtSecret = crypto.randomBytes(32).toString('hex');
                if (process.env.ASTRA_LOCAL_DEMO !== '1') console.warn('JWT_SECRET is not set. Using ephemeral runtime secret; sessions reset on restart.');
            }
        }
        return this._jwtSecret;
    }

    async generateToken(userOrId) {
        const userId = typeof userOrId === 'object' ? userOrId?.userId || userOrId?.id : userOrId;
        if (!userId) {
            throw new Error('Cannot generate token without user ID');
        }

        const payload = {
            userId,
            username: typeof userOrId === 'object' ? userOrId?.username || null : null
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
            issuer: this.jwtIssuer
        });
    }

    async verifyToken(token) {
        if (!token || typeof token !== 'string') {
            return null;
        }

        try {
            return jwt.verify(token, this.jwtSecret, { issuer: this.jwtIssuer });
        } catch {
            return null;
        }
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }

    async comparePassword(password, hash) {
        if (!password || !hash) {
            return false;
        }
        return bcrypt.compare(password, hash);
    }

    async authenticateUser(username, password) {
        try {
            const user = await postgresDb.authenticateUser(username, password);
            if (!user) {
                return null;
            }

            const token = await this.generateToken({
                userId: user.id,
                username: user.username
            });

            return {
                ...user,
                token
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    }

    async validateSession(token) {
        const decoded = await this.verifyToken(token);
        if (!decoded?.userId) {
            return null;
        }

        const user = await postgresDb.getUser('id', decoded.userId);
        if (!user) {
            return null;
        }

        return {
            userId: user.id,
            id: user.id,
            username: user.username
        };
    }
}

export default new AuthService();
