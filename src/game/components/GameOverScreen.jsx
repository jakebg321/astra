import React from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Target, Zap, Clock } from 'lucide-react';
import { Z_INDEX } from '../constants/zIndex';

const NO_STATS = { kills: 0, hits: 0, shots: 0, damage: 0, time: '0:00' };

const GameOverScreen = ({
  winner = false,
  isWin = false,
  playerStats: serverPlayerStats,
  opponentStats: serverOpponentStats,
  isDraw = false,
  endReason = 'normal',
  onRematch,
  onReplay,
  onLeave,
  onLeaveGame
}) => {
  const playerStats = serverPlayerStats || NO_STATS;
  const opponentStats = serverOpponentStats || NO_STATS;

  const isWinner = winner || isWin;
  const handleRematch = onRematch || onReplay;
  const handleLeave = onLeave || onLeaveGame;

  const playerAccuracy = playerStats.shots > 0 ? Math.round((playerStats.hits / playerStats.shots) * 100) : 0;
  const opponentAccuracy = opponentStats.shots > 0 ? Math.round((opponentStats.hits / opponentStats.shots) * 100) : 0;

  const opponentLeft = endReason === 'disconnect' || endReason === 'dual_disconnect';
  const resultText = isDraw ? 'DRAW' : isWinner ? 'VICTORY' : 'DEFEAT';
  const resultNote = isDraw
    ? (endReason === 'dual_disconnect' ? 'Both pilots disconnected' : null)
    : (isWinner && opponentLeft ? 'Opponent left the match' : null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const bannerVariants = {
    hidden: { scale: 0.5, opacity: 0, y: -50 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: { type: "spring", bounce: 0.5, duration: 0.8 }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center font-mono"
      style={{ zIndex: Z_INDEX?.GAME_OVER || 1000 }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center">
        {isDraw ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full"
          />
        ) : isWinner ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute w-[800px] h-[400px] bg-red-500/10 blur-[120px] rounded-full"
          />
        )}
        <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-black to-transparent" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-8 flex items-center gap-3 text-cyan-500 uppercase tracking-[0.3em] font-bold text-xl"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 10px #06b6d4', '0 0 20px #06b6d4', '0 0 10px #06b6d4'] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-8 h-8 rounded-sm bg-cyan-500/10 border border-cyan-500 flex items-center justify-center rotate-45"
          >
            <div className="w-3 h-3 bg-orange-500 rotate-45" />
          </motion.div>
          ASTRA
        </motion.div>


        <motion.div variants={bannerVariants} className="mb-10 text-center">
          <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isDraw
              ? 'from-cyan-300 to-cyan-600 drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]'
              : isWinner
                ? 'from-green-300 to-green-600 drop-shadow-[0_0_25px_rgba(74,222,128,0.4)]'
                : 'from-red-400 to-red-700 drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]'
            }`}>
            {resultText}
          </h1>
          {resultNote && (
            <p className="mt-3 text-sm md:text-base tracking-widest text-gray-400 uppercase">{resultNote}</p>
          )}
        </motion.div>


        <motion.div
          variants={itemVariants}
          className="w-full max-w-3xl grid grid-cols-[1fr_auto_1fr] gap-6 items-center mb-12 bg-white/5 border border-white/10 rounded p-6"
        >
          <div className="flex flex-col gap-4 text-right">
            <h3 className={`text-sm tracking-widest font-bold mb-2 ${isWinner && !isDraw ? 'text-green-400' : 'text-gray-400'}`}>YOU</h3>

            <StatRow
              label="KILLS"
              icon={<Crosshair size={14} />}
              value={playerStats.kills || '--'}
              isBetter={(playerStats.kills || 0) >= (opponentStats.kills || 0)}
              align="right"
            />
            <StatRow
              label="ACCURACY"
              icon={<Target size={14} />}
              value={`${playerAccuracy}%`}
              isBetter={playerAccuracy >= opponentAccuracy}
              align="right"
            />
            <StatRow
              label="DAMAGE DEALT"
              icon={<Zap size={14} />}
              value={Math.round(playerStats.damage || 0)}
              isBetter={(playerStats.damage || 0) >= (opponentStats.damage || 0)}
              align="right"
            />
          </div>

          <div className="h-full w-px bg-white/10 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-[10px] tracking-widest font-bold text-gray-500">VS</div>
          </div>

          <div className="flex flex-col gap-4 text-left">
            <h3 className={`text-sm tracking-widest font-bold mb-2 ${!isWinner && !isDraw ? 'text-red-400' : 'text-gray-400'}`}>OPPONENT</h3>

            <StatRow
              label="KILLS"
              value={opponentStats.kills || '--'}
              isBetter={(opponentStats.kills || 0) >= (playerStats.kills || 0)}
              align="left"
            />
            <StatRow
              label="ACCURACY"
              value={`${opponentAccuracy}%`}
              isBetter={opponentAccuracy >= playerAccuracy}
              align="left"
            />
            <StatRow
              label="DAMAGE DEALT"
              value={Math.round(opponentStats.damage || 0)}
              isBetter={(opponentStats.damage || 0) >= (playerStats.damage || 0)}
              align="left"
            />
          </div>


          <div className="col-span-3 mt-4 pt-4 border-t border-white/5 flex justify-center items-center gap-2 text-xs font-bold tracking-widest text-gray-500">
            <Clock size={14} />
            MATCH TIME: {playerStats.time || '0:00'}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRematch}
            className="px-8 py-4 bg-cyan-500/10 border border-cyan-500 text-cyan-400 text-sm font-bold uppercase tracking-[0.2em] hover:bg-cyan-500/20 transition-colors"
          >
            REMATCH
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLeave}
            className="px-8 py-4 bg-transparent border border-gray-600 text-gray-400 text-sm font-bold uppercase tracking-[0.2em] hover:text-white hover:border-gray-400 transition-colors"
          >
            LEAVE
          </motion.button>
        </motion.div>

      </motion.div>
    </div>
  );
};

const StatRow = ({ label, icon, value, isBetter, align }) => (
  <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
    <div className={`text-[10px] font-bold tracking-widest text-gray-500 flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
      {icon}
      {label}
    </div>
    <div className={`text-sm md:text-base font-bold ${isBetter ? 'text-white' : 'text-gray-600'}`}>
      {value}
    </div>
  </div>
);

export default GameOverScreen;