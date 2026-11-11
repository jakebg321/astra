
export class GameStatsTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.stats = {
      shotsFired: 0,
      hits: 0,
      damageDealt: 0,
      damageReceived: 0,
      gameStartTime: Date.now(),
      gameEndTime: null,
      isWin: false
    };
  }

  startGame() {
    this.reset();
  }

  recordShotFired() {
    this.stats.shotsFired++;
  }

  recordHit(damage = 0.1) {
    this.stats.hits++;
    this.stats.damageDealt += damage;
  }

  recordDamageReceived(damage = 0.1) {
    this.stats.damageReceived += damage;
  }

  endGame(isWin = false) {
    this.stats.gameEndTime = Date.now();
    this.stats.isWin = isWin;
    console.log(`Game ended. Winner: ${isWin}`, this.getFormattedStats());
    return this.getFormattedStats();
  }

  getAccuracy() {
    if (this.stats.shotsFired === 0) return 0;
    return Math.round((this.stats.hits / this.stats.shotsFired) * 100);
  }

  getGameDuration() {
    const endTime = this.stats.gameEndTime || Date.now();
    const durationMs = endTime - this.stats.gameStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return { minutes, seconds, totalMs: durationMs };
  }

  getMoneyAmount() {
    const { isWin } = this.stats;
    const accuracy = this.getAccuracy();
    const { totalMs } = this.getGameDuration();

    let baseAmount = isWin ? 200 : 50;
    let accuracyBonus = Math.floor(accuracy * 2);
    let timeBonus = Math.max(0, 300 - Math.floor(totalMs / 1000));
    
    if (isWin) {
      return Math.min(1000, baseAmount + accuracyBonus + timeBonus);
    } else {
      return Math.max(25, Math.floor(baseAmount * 0.5));
    }
  }

  getFormattedStats() {
    const accuracy = this.getAccuracy();
    const { minutes, seconds } = this.getGameDuration();
    const money = this.getMoneyAmount();

    return {
      shotsFired: this.stats.shotsFired,
      hits: this.stats.hits,
      accuracy: `${accuracy}%`,
      gameTime: `${minutes}m ${seconds}s`,
      damageDealt: this.stats.damageDealt.toFixed(2),
      damageReceived: this.stats.damageReceived.toFixed(2),
      money: `$${money}`,
      isWin: this.stats.isWin
    };
  }

  getRawStats() {
    return { ...this.stats };
  }
}

export const gameStatsTracker = new GameStatsTracker();