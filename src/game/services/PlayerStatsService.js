

export class PlayerStatsService {
  constructor() {
    this.API_BASE = '/api';
  }

  async recordWin() { return null; }

  async recordLoss() { return null; }

  async getPlayerStats(userId) {
    try {
      const response = await fetch(`${this.API_BASE}/stats/user/${userId}`);
      if (response.ok) {
        return await response.json();
      }
      return { wins: 0, losses: 0, total_games: 0 };
    } catch (error) {
      return { wins: 0, losses: 0, total_games: 0 };
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const response = await fetch(`${this.API_BASE}/stats/leaderboard?limit=${limit}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

export const playerStatsService = new PlayerStatsService();
