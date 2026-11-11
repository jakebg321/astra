

import { debugLogger } from '../utils/DebugLogger.js';

export class MatchHistoryService {
  constructor() {
    this.matches = new Map();
    this.playerStats = new Map();
    this.storageKey = 'astra_match_history';
    this.maxHistorySize = 1000;
    
    this.loadFromStorage();
  }

  recordMatch(matchData) {
    try {
      const matchId = this.generateMatchId();
      
      const match = {
        id: matchId,
        timestamp: Date.now(),
        type: matchData.type || 'free',
        duration: matchData.duration || 0,
        players: matchData.players || [],
        winner: matchData.winner,
        loser: matchData.loser,

        stats: {
          shotsTotal: matchData.stats?.shotsTotal || 0,
          shotsHit: matchData.stats?.shotsHit || 0,
          accuracy: matchData.stats?.accuracy || 0,
          damageDealt: matchData.stats?.damageDealt || 0,
          distanceTraveled: matchData.stats?.distanceTraveled || 0,
          killTime: matchData.stats?.killTime || null
        },

        server: {
          version: matchData.serverVersion || '1.0.0',
          region: matchData.region || 'local',
          ping: matchData.ping || 0
        }
      };

      this.matches.set(matchId, match);
      this.updatePlayerStats(match);
      this.pruneOldMatches();
      this.saveToStorage();

      debugLogger.logNetwork('MATCH_RECORDED', { matchId, type: match.type, winner: match.winner });

      return matchId;
    } catch (error) {
      debugLogger.logError(error, { context: 'recordMatch' });
      throw error;
    }
  }

  updatePlayerStats(match) {
    match.players.forEach(player => {
      if (!this.playerStats.has(player.id)) {
        this.playerStats.set(player.id, this.createEmptyPlayerStats(player));
      }

      const stats = this.playerStats.get(player.id);

      stats.totalMatches++;

      if (player.id === match.winner) {
        stats.wins++;
      } else {
        stats.losses++;
      }

      if (player.stats) {
        stats.totalShots += player.stats.shots || 0;
        stats.totalHits += player.stats.hits || 0;
        stats.totalDamage += player.stats.damage || 0;
        stats.totalDistance += player.stats.distance || 0;
        
        if (player.stats.killTime) {
          stats.killTimes.push(player.stats.killTime);
        }
      }

      stats.winRate = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
      stats.accuracy = stats.totalShots > 0 ? (stats.totalHits / stats.totalShots) * 100 : 0;
      stats.averageKillTime = stats.killTimes.length > 0 ? 
        stats.killTimes.reduce((a, b) => a + b, 0) / stats.killTimes.length : 0;

      stats.lastSeen = Date.now();
      stats.lastMatch = match.id;
    });
  }

  createEmptyPlayerStats(player) {
    return {
      playerId: player.id,
      playerName: player.name,

      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,

      totalShots: 0,
      totalHits: 0,
      accuracy: 0,
      totalDamage: 0,
      totalDistance: 0,
      killTimes: [],
      averageKillTime: 0,

      firstSeen: Date.now(),
      lastSeen: Date.now(),
      lastMatch: null
    };
  }

  getPlayerHistory(playerId, limit = 50) {
    const playerMatches = Array.from(this.matches.values())
      .filter(match => match.players.some(p => p.id === playerId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return {
      playerId,
      stats: this.playerStats.get(playerId) || this.createEmptyPlayerStats({ id: playerId, name: 'Unknown' }),
      matches: playerMatches
    };
  }

  generateLeaderboard(type = 'all', metric = 'winRate', limit = 50) {
    const players = Array.from(this.playerStats.values());
    
    const filteredPlayers = players;

    filteredPlayers.sort((a, b) => {
      switch (metric) {
        case 'winRate':
          return b.winRate - a.winRate;
        case 'totalWins':
          return b.wins - a.wins;
        case 'accuracy':
          return b.accuracy - a.accuracy;
        case 'totalMatches':
          return b.totalMatches - a.totalMatches;
        case 'averageKillTime':
          return a.averageKillTime - b.averageKillTime;
        default:
          return b.winRate - a.winRate;
      }
    });

    return filteredPlayers.slice(0, limit);
  }

  generateAnalytics(playerId = null) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let matches = Array.from(this.matches.values());
    if (playerId) {
      matches = matches.filter(match => 
        match.players.some(p => p.id === playerId)
      );
    }

    const analytics = {
      overview: {
        totalMatches: matches.length,
        freeMatches: matches.filter(m => m.type === 'free').length
      },

      timeframes: {
        last24h: matches.filter(m => now - m.timestamp < oneDay).length,
        last7d: matches.filter(m => now - m.timestamp < oneWeek).length,
        last30d: matches.filter(m => now - m.timestamp < oneMonth).length
      },

      performance: {
        averageMatchDuration: matches.length > 0 ? 
          matches.reduce((sum, m) => sum + (m.duration || 0), 0) / matches.length : 0,
        averageAccuracy: this.calculateAverageAccuracy(matches),
        mostActiveHour: this.findMostActiveHour(matches),
        winRateByTimeOfDay: this.calculateWinRateByTimeOfDay(matches, playerId)
      },

      streaks: {
        longestWinStreak: this.findLongestWinStreak(matches, playerId)
      }
    };

    return analytics;
  }

  generateMatchId() {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateAverageAccuracy(matches) {
    const totalShots = matches.reduce((sum, m) => 
      sum + (m.stats?.shotsTotal || 0), 0);
    const totalHits = matches.reduce((sum, m) => 
      sum + (m.stats?.shotsHit || 0), 0);
    
    return totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
  }

  findMostActiveHour(matches) {
    const hourCounts = {};
    matches.forEach(match => {
      const hour = new Date(match.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;
  }

  calculateWinRateByTimeOfDay(matches, playerId) {
    if (!playerId) return {};

    const hourStats = {};
    matches.forEach(match => {
      const hour = new Date(match.timestamp).getHours();
      if (!hourStats[hour]) {
        hourStats[hour] = { wins: 0, total: 0 };
      }
      
      hourStats[hour].total++;
      if (match.winner === playerId) {
        hourStats[hour].wins++;
      }
    });

    const result = {};
    Object.entries(hourStats).forEach(([hour, stats]) => {
      result[hour] = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
    });

    return result;
  }

  findLongestWinStreak(matches, playerId) {
    if (!playerId) return 0;

    const playerMatches = matches
      .filter(m => m.players.some(p => p.id === playerId))
      .sort((a, b) => a.timestamp - b.timestamp);

    let currentStreak = 0;
    let maxStreak = 0;

    playerMatches.forEach(match => {
      if (match.winner === playerId) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  pruneOldMatches() {
    if (this.matches.size <= this.maxHistorySize) return;

    const sortedMatches = Array.from(this.matches.entries())
      .sort(([,a], [,b]) => b.timestamp - a.timestamp);

    const toKeep = sortedMatches.slice(0, this.maxHistorySize);
    this.matches.clear();
    toKeep.forEach(([id, match]) => this.matches.set(id, match));
  }

  saveToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const data = {
        matches: Array.from(this.matches.entries()),
        playerStats: Array.from(this.playerStats.entries()),
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      debugLogger.logError(error, { context: 'saveToStorage' });
    }
  }

  loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.matches = new Map(data.matches || []);
        this.playerStats = new Map(data.playerStats || []);
        
      }
    } catch (error) {
      debugLogger.logError(error, { context: 'loadFromStorage' });
    }
  }

  clearHistory() {
    this.matches.clear();
    this.playerStats.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  exportHistory() {
    return {
      matches: Array.from(this.matches.values()),
      playerStats: Array.from(this.playerStats.values()),
      exportDate: new Date().toISOString()
    };
  }
}

export const matchHistoryService = new MatchHistoryService();

if (typeof window !== 'undefined') {
  window.astraHistory = {
    service: matchHistoryService,
    getMyHistory: (playerId) => matchHistoryService.getPlayerHistory(playerId),
    getLeaderboard: () => matchHistoryService.generateLeaderboard(),
    getAnalytics: () => matchHistoryService.generateAnalytics(),
    export: () => matchHistoryService.exportHistory(),
    clear: () => matchHistoryService.clearHistory()
  };
}