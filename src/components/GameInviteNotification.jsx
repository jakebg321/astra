import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, X, GamepadIcon } from 'lucide-react';
import { getWebSocketInstance } from '../game/services/UnifiedWebSocket';

const GameInviteNotification = ({ invite, onAccept, onDecline, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!invite) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invite, onClose]);

  if (!invite) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 right-4 z-50 bg-gradient-to-br from-purple-900/95 to-blue-900/95 border border-purple-500/50 rounded-lg p-4 shadow-xl backdrop-blur-sm min-w-80"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GamepadIcon className="w-5 h-5 text-purple-400" />
          <span className="text-purple-300 font-medium text-sm">Game Invite</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-white font-medium mb-1">
          {invite.inviterName || 'A friend'} wants to play!
        </div>
        <div className="text-gray-300 text-sm mb-2">
          {invite.message}
        </div>
        <div className="text-xs text-gray-400">
          Room: {invite.roomName} • {invite.gameType}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Auto-decline in:</span>
          <span>{timeLeft}s</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1">
          <motion.div
            className="bg-purple-500 h-1 rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 30) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAccept(invite)}
          className="flex-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 rounded py-2 px-3 transition-colors text-sm font-medium"
        >
          <UserCheck size={16} className="inline mr-2" />
          Join Game
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDecline(invite)}
          className="flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded py-2 px-3 transition-colors text-sm font-medium"
        >
          <X size={16} className="inline mr-2" />
          Decline
        </motion.button>
      </div>
    </motion.div>
  );
};

const GameInviteManager = () => {
  const [invites, setInvites] = useState([]);

  const addInvite = (inviteData) => {
    const invite = {
      id: Date.now() + Math.random(),
      ...inviteData,
      timestamp: Date.now()
    };
    setInvites(prev => [...prev, invite]);
  };

  const removeInvite = (inviteId) => {
    setInvites(prev => prev.filter(inv => inv.id !== inviteId));
  };

  const handleAccept = (invite) => {
    console.log('Accepting game invite:', invite);
    
    if (invite.roomId) {
      const ws = getWebSocketInstance();
      ws.joinRoom(invite.roomId);
    }
    
    removeInvite(invite.id);
  };

  const handleDecline = (invite) => {
    console.log('Declining game invite:', invite);
    removeInvite(invite.id);
  };

  useEffect(() => {
    window.gameInviteManager = { addInvite };
    return () => {
      delete window.gameInviteManager;
    };
  }, []);

  return (
    <AnimatePresence>
      {invites.map(invite => (
        <GameInviteNotification
          key={invite.id}
          invite={invite}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onClose={() => removeInvite(invite.id)}
        />
      ))}
    </AnimatePresence>
  );
};

export default GameInviteManager;