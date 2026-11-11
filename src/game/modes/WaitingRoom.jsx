import React from 'react';
import { motion } from 'framer-motion';
import { Users, Play, ArrowLeft, Settings } from 'lucide-react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { useNavigate } from 'react-router-dom';

const WaitingRoom = ({ roomData, onLeaveGame }) => {
  const navigate = useNavigate();
  if (!roomData) return null;

  const ws = getWebSocketInstance();
  const localPlayerId = ws?.gameStateManager?.playerId;
  const players = Array.isArray(roomData.players) ? roomData.players : [];
  const localPlayer = players.find((player) => player.id === localPlayerId);
  const localReady = !!localPlayer?.ready;
  const allPlayersPresent = players.length === 2;
  const allReady = allPlayersPresent && players.every((player) => !!player.ready);

  const isReadyPhase = roomData?.gamePhase ? roomData.gamePhase === 'ready' : true;

  return (
    <div className="flex items-center justify-center min-h-screen relative z-20">
      <div className="hud-panel p-8 max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Users className="w-8 h-8 text-cyan-400" />
          <h2 className="text-2xl font-bold tactical-title">
            {roomData.reconnected ? 'RECONNECTED — RESTARTING' : 'WAITING FOR PILOT'}
          </h2>
        </div>
        {roomData.reconnected && (
          <p className="text-green-400 text-sm mb-4">Opponent reconnected. Fresh game starting...</p>
        )}
        <p className="text-gray-400 mb-6">Room ID: {roomData.id}</p>
        <p className="text-sm text-cyan-300 mb-4">{players.length}/2 pilots in lobby</p>

        <div className="space-y-2 mb-6">
          {players.map((player) => (
            <div key={player.id || player.name} className="flex items-center justify-between">
              <span className="text-cyan-300">{player?.name || 'Unknown'}</span>
              <span className={`font-mono text-sm ${player?.ready ? 'text-green-400' : 'text-yellow-300'}`}>
                {player?.ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
          ))}
        </div>

        {allPlayersPresent && isReadyPhase && !allReady && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={localReady}
            onClick={() => {
              ws.send('player_ready', {});
            }}
            className={`w-full border text-white font-bold py-4 px-6 transition-all flex items-center justify-center gap-3 tactical-btn ${
              localReady
                ? 'bg-gray-700/80 border-gray-500/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600/80 to-orange-600/80 hover:from-red-500 hover:to-orange-500 border-orange-500/50'
            }`}
          >
            <Play size={20} />
            <span>{localReady ? 'WAITING FOR OTHER PLAYER' : 'READY UP'}</span>
          </motion.button>
        )}


        {allPlayersPresent && !isReadyPhase && (
          <div className="w-full mt-2 bg-blue-900/30 border border-blue-500/50 text-blue-300 font-semibold py-3 px-4 rounded">
            Synchronizing both players...
          </div>
        )}

        {allReady && (
          <div className="w-full mt-2 bg-green-900/30 border border-green-500/50 text-green-300 font-semibold py-3 px-4 rounded">
            Both players ready. Starting...
          </div>
        )}

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/settings')}
            className="w-full bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-500 hover:to-gray-600 border border-gray-500/50 text-white font-bold py-3 px-6 transition-all flex items-center justify-center gap-3 tactical-btn"
          >
            <Settings size={18} />
            <span>SETTINGS</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLeaveGame}
            className="w-full tactical-btn flex items-center justify-center gap-3 py-3"
          >
            <ArrowLeft size={18} />
            <span>LEAVE ROOM</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
