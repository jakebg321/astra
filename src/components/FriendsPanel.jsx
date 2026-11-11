import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Send,
  UserCheck,
  Clock,
  Trash2,
  MessageCircle,
  Gamepad2
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getWebSocketInstance } from '../game/services/UnifiedWebSocket';
import { friendsApi } from '../services/friendsApi';

const FriendsPanel = ({ isOpen, onClose }) => {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && isOpen) {
      loadFriendsData();
    }
  }, [profile, isOpen]);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      
      console.log(`Fetching friends for user ${profile.id}`);
      const fetchedFriends = await friendsApi.getFriends(profile.id);
      console.log(`Setting ${fetchedFriends?.length || 0} friends`);
      setFriends(fetchedFriends);

      const requests = await friendsApi.getFriendRequests(profile.id);
      setPendingRequests(requests.received || []);
      setSentRequests(requests.sent || []);
    } catch (error) {
      console.error('Failed to load friends data:', error);
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await friendsApi.sendFriendRequest({
        fromUserId: profile.id,
        toUserId: userId
      });

      const user = searchResults.find(u => u.id === userId);
      if (user) {
        setSentRequests([...sentRequests, user]);
        setSearchResults(searchResults.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await friendsApi.acceptFriendRequest(requestId);
      const user = pendingRequests.find(r => r.id === requestId);
      if (user) {
        setFriends([...friends, user.from_user]);
        setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await friendsApi.rejectFriendRequest(requestId);
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await friendsApi.removeFriend(profile.id, friendId);
      setFriends(friends.filter(f => f.id !== friendId));
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  const inviteToGame = async (friend) => {
    try {
      const ws = getWebSocketInstance();
      if (!ws) {
        console.error('No WebSocket connection available');
        return;
      }

      ws.inviteFriend(
        friend.id,
        'multiplayer',
        `${profile?.username || 'A player'} invited you to a game!`
      );

      console.log(`Game invite sent to ${friend.username}`);
    } catch (error) {
      console.error('Failed to send game invite:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-2xl mx-4 h-[600px]"
          >
            <div className="relative bg-slate-900/95 border border-cyan-500/30 rounded-lg h-full flex flex-col">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Friends</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex gap-4 mt-4">
                  {[
                    { id: 'friends', label: 'Friends', icon: UserCheck },
                    { id: 'requests', label: 'Requests', icon: Clock, badge: pendingRequests.length },
                    { id: 'search', label: 'Search', icon: Search }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <tab.icon size={18} />
                      <span>{tab.label}</span>
                      {tab.badge > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {activeTab === 'friends' && (
                      <div className="space-y-3">
                        {friends.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No friends yet. Search for pilots to add!</p>
                          </div>
                        ) : (
                          friends.map(friend => (
                            <motion.div
                              key={friend.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-between p-4 bg-slate-800/50 border border-gray-700 rounded-lg hover:border-cyan-500/30 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {friend.username[0].toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="text-white font-medium">{friend.username}</h4>
                                  <p className="text-xs text-gray-400">
                                    {friend.status === 'online' ? (
                                      <span className="text-green-400">Online</span>
                                    ) : (
                                      `Last seen ${new Date(friend.last_active).toLocaleDateString()}`
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => inviteToGame(friend)}
                                  className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                                  title="Invite to game"
                                >
                                  <Gamepad2 size={18} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors">
                                  <MessageCircle size={18} />
                                </button>
                                <button
                                  onClick={() => removeFriend(friend.id)}
                                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'requests' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium text-cyan-300 mb-3">Pending Requests</h3>
                          {pendingRequests.length === 0 ? (
                            <p className="text-gray-400 text-sm">No pending requests</p>
                          ) : (
                            <div className="space-y-2">
                              {pendingRequests.map(request => (
                                <motion.div
                                  key={request.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center justify-between p-3 bg-slate-800/50 border border-gray-700 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {request.from_user.username[0].toUpperCase()}
                                    </div>
                                    <span className="text-white">{request.from_user.username}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => acceptRequest(request.id)}
                                      className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={() => rejectRequest(request.id)}
                                      className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-cyan-300 mb-3">Sent Requests</h3>
                          {sentRequests.length === 0 ? (
                            <p className="text-gray-400 text-sm">No sent requests</p>
                          ) : (
                            <div className="space-y-2">
                              {sentRequests.map(request => (
                                <div
                                  key={request.id}
                                  className="flex items-center justify-between p-3 bg-slate-800/50 border border-gray-700 rounded-lg opacity-75"
                                >
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-yellow-400" />
                                    <span className="text-gray-300">{request.to_user.username}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">Pending</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'search' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                            placeholder="Search for pilots by username..."
                            className="w-full px-4 py-3 pr-12 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            onClick={searchUsers}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            {isSearching ? (
                              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Search size={20} />
                            )}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {searchResults.map(user => {
                            const isFriend = friends.some(f => f.id === user.id);
                            const hasSentRequest = sentRequests.some(r => r.to_user.id === user.id);
                            
                            return (
                              <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-4 bg-slate-800/50 border border-gray-700 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {user.username[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="text-white font-medium">{user.username}</h4>
                                    <p className="text-xs text-gray-400">
                                      {user.total_games} games • {user.wins} wins
                                    </p>
                                  </div>
                                </div>
                                
                                {isFriend ? (
                                  <span className="text-sm text-green-400">Already friends</span>
                                ) : hasSentRequest ? (
                                  <span className="text-sm text-yellow-400">Request sent</span>
                                ) : (
                                  <button
                                    onClick={() => sendFriendRequest(user.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 rounded transition-all"
                                  >
                                    <UserPlus size={16} />
                                    <span className="text-sm">Add Friend</span>
                                  </button>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FriendsPanel;
