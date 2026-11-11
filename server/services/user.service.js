import postgresDb from '../postgresDatabase.js';

class UserService {
    async getByUsername(username) {
        return await postgresDb.getUser('username', username);
    }

    async getById(id) {
        return await postgresDb.getUser('id', id);
    }

    async createUser(userData) {
        return await postgresDb.createUser(userData);
    }

    async authenticateUser(username, password) {
        return await postgresDb.authenticateUser(username, password);
    }

    async updateUserByUsername(username, updates) {
        const user = await this.getByUsername(username);
        if (!user) return null;

        return await postgresDb.updateUser(user.id, updates);
    }

    async updateStats(userId, statsUpdate) {
        return await postgresDb.updateUserStats(userId, statsUpdate);
    }

    async isUsernameAvailable(username) {
        const user = await this.getByUsername(username);
        return !user;
    }

    async getLeaderboard(limit = 10, friendIds = null) {
        return await postgresDb.getLeaderboard(limit, friendIds);
    }

    async getMatchHistory(userId, limit = 20) {
        return await postgresDb.getUserMatches(userId, limit);
    }

    async getHeadToHeadStats(userId1, userId2) {

        return {
            totalMatches: 0,
            user1Wins: 0,
            user2Wins: 0,
            draws: 0
        };
    }

    async searchUsers(query) {
        return await postgresDb.searchUsers(query);
    }
}

export default new UserService();