import postgresDb from '../postgresDatabase.js';
import userService from './user.service.js';

class MatchService {
    async recordMatch(matchData) {
        try {

            const match = await postgresDb.createMatch(matchData);

            const player1Wins = matchData.winner_id === matchData.player1_id ? 1 : 0;
            const player1Losses = matchData.winner_id === matchData.player2_id ? 1 : 0;
            const player2Wins = matchData.winner_id === matchData.player2_id ? 1 : 0;
            const player2Losses = matchData.winner_id === matchData.player1_id ? 1 : 0;

            await userService.updateStats(matchData.player1_id, {
                games: 1,
                wins: player1Wins,
                losses: player1Losses
            });

            await userService.updateStats(matchData.player2_id, {
                games: 1,
                wins: player2Wins,
                losses: player2Losses
            });

            return {
                matchId: match.id,
                success: true
            };
        } catch (error) {
            console.error('Error recording match:', error);
            throw error;
        }
    }

    async getMatchById(matchId) {

        return null;
    }

    async getRecentMatches(limit = 20) {

        return [];
    }

    async getPlayerStats(userId) {
        return await userService.getById(userId);
    }
}

export default new MatchService();