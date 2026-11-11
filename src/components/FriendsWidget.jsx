import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Circle,
  Send,
  ChevronDown,
  ChevronUp,
  GamepadIcon,
  Clock
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getWebSocketInstance } from '../game/services/UnifiedWebSocket';
import AddFriendModal from './AddFriendModal';
import { friendsApi } from '../services/friendsApi';

const FriendsWidget = ({ onInviteFriend }) => {
  const { profile } = useUser();
  const [friends, setFriends] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [friendsInGame, setFriendsInGame] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadFriends();
      setupPresenceTracking();
    }
  }, [profile?.id]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const friendsData = await friendsApi.getFriends(profile.id);
      setFriends(friendsData);

      const ws = getWebSocketInstance();
      ws.loadFriends(friendsData.map(f => f.id));

      console.log('Loaded', friendsData.length, 'friends from API');
    } catch (error) {
      console.error('Failed to load friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const setupPresenceTracking = () => {
    const ws = getWebSocketInstance();

    const handleFriendsList = (data) => {
      const { friends: wsFriends } = data;
      if (!wsFriends || !Array.isArray(wsFriends)) return;

      const onlineSet = new Set();
      wsFriends.forEach(f => {
        if (f.isOnline) onlineSet.add(f.username?.toLowerCase());
      });

      setFriends(prev => prev.map(f => ({
        ...f,
        isOnline: onlineSet.has(f.username?.toLowerCase())
      })));

      const onlineList = wsFriends.filter(f => f.isOnline);
      setOnlineFriends(onlineList);
      console.log('Friends online:', onlineList.length, '/', wsFriends.length);
    };

    const handleFriendsPresence = (data) => {
      const { friendsPresence } = data;
      if (!friendsPresence) return;

      setFriends(prev => prev.map(f => {
        const presence = friendsPresence[f.id];
        if (presence) {
          return { ...f, isOnline: presence.status !== 'offline', gameData: presence.gameData };
        }
        return f;
      }));
    };

    ws.on('friends_list', handleFriendsList);
    ws.on('friends_presence', handleFriendsPresence);
    ws.updatePresence('in_lobby');

    return () => {
      ws.off('friends_list', handleFriendsList);
      ws.off('friends_presence', handleFriendsPresence);
    };
  };

  const inviteFriendToGame = (friend) => {
    const inviteMessage = `${profile.username} invited you to play ASTRA!`;

    if (onInviteFriend) {
      onInviteFriend(friend, inviteMessage);
      return;
    }

    const ws = getWebSocketInstance();
    ws.inviteFriend(friend.id, 'multiplayer', inviteMessage);
  };

  const StatusIndicator = ({ status, size = 14 }) => {
    const colors = {
      online: {
        base: 'bg-green-500',
        glow: 'shadow-[0_0_8px_rgba(34,197,94,0.9)]'
      },
      in_game: {
        base: 'bg-purple-500',
        glow: 'shadow-[0_0_8px_rgba(168,85,247,0.9)]'
      },
      offline: {
        base: 'bg-gray-500',
        glow: ''
      }
    };

    const config = colors[status] || colors.offline;
    const isOnline = status === 'online' || status === 'in_game';

    return (
      <div className={`relative flex items-center justify-center`}>
        {isOnline && (
          <div className={`absolute inset-0 rounded-full ${config.base} opacity-30 animate-ping`} style={{ width: size * 1.5, height: size * 1.5 }} />
        )}
        <Circle
          className={`${config.base} ${config.glow} fill-current relative z-10`}
          size={size}
        />
      </div>
    );
  };

  const onlineCount = friends.filter(f => f.isOnline).length;
  const totalCount = friends.length;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 border border-cyan-500/50 text-white font-bold py-2 px-3 transition-all flex items-center gap-1 tactical-btn relative text-sm"
      >
        <Users size={18} />
        <span className="hidden sm:inline">FRIENDS</span>
        <span className="sm:hidden">FRND</span>
        {onlineCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {onlineCount}
          </span>
        )}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-80 bg-gradient-to-br from-gray-900/95 to-purple-900/95 border border-purple-500/50 rounded-lg shadow-xl z-50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Friends</h3>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <StatusIndicator status="online" size={10} />
                  <span>{onlineCount} online</span>
                  <span className="text-gray-500">/ {totalCount} total</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {friends.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">

                      {[...friends].sort((a, b) => {
                        if (a.isOnline && !b.isOnline) return -1;
                        if (!a.isOnline && b.isOnline) return 1;
                        return (a.username || '').localeCompare(b.username || '');
                      }).map(friend => (
                        <motion.div
                          key={friend.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIndicator
                              status={friend.isOnline ? 'online' : 'offline'}
                            />
                            <div>
                              <div className="text-white font-medium text-sm">
                                {friend.display_name || friend.username}
                              </div>
                              <div className={`text-xs ${friend.isOnline ? 'text-green-300' : 'text-gray-500'}`}>
                                {friend.isOnline ? 'Online' : 'Offline'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => inviteFriendToGame(friend)}
                              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${friend.isOnline
                                ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-600/30'
                                }`}
                              title="Invite to Game"
                            >
                              <Send size={14} />
                              <span>Invite</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No friends yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Add friends to invite them to play!
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsOpen(false);
                        }}
                        className="flex-1 bg-gray-700/50 text-gray-300 py-2 px-3 rounded text-sm hover:bg-gray-600/50 transition-colors"
                      >
                        View All Friends
                      </button>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          setShowAddFriendModal(true);
                        }}
                        className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 py-2 px-3 rounded text-sm hover:bg-cyan-500/30 transition-colors"
                      >
                        <UserPlus size={14} />
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />
    </div>
  );
};

export default FriendsWidget;
