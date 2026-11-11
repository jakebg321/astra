import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UserPlus, 
    Users, 
    Bell, 
    Check, 
    X, 
    Loader2,
    Circle,
    Clock,
    Search
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { Alert, AlertDescription } from '../ui/alert';
import Avatar from '../ui/Avatar';
import FriendSearch from './FriendSearch';
import { friendsApi } from '../../services/friendsApi';

const FriendList = () => {
    const { profile } = useUser();
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [newFriendUsername, setNewFriendUsername] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('friends');

    const fetchFriends = async () => {
        if (!profile?.id) return;
        
        try {
            setIsLoading(true);
            setError('');

            const friendsData = await friendsApi.getFriends(profile.id);
            setFriends(friendsData || []);

            const requestsData = await friendsApi.getFriendRequests(profile.id);
            setRequests(requestsData.received || []);
        } catch (err) {
            setError('Failed to load friends list');
            console.error('Error fetching friends:', err);
            setFriends([]);
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [profile?.id]);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!newFriendUsername.trim()) return;

        try {
            setError('');
            await friendsApi.sendFriendRequest({
                fromUserId: profile.id,
                toUsername: newFriendUsername.trim()
            });

            setNewFriendUsername('');
        } catch (err) {
            setError(err.message || 'Failed to send friend request');
        }
    };

    const handleRequestResponse = async (requestId, action) => {
        try {
            setError('');
            await friendsApi.respondToFriendRequest(requestId, action);

            setRequests(requests.filter(req => req.id !== requestId));
            
            if (action === 'accept') {
                const friendsData = await friendsApi.getFriends(profile?.id);
                setFriends(friendsData || []);
            }
        } catch (err) {
            setError(err.message || 'Failed to handle request');
        }
    };

    const StatusIndicator = ({ status }) => {
        const config = {
            online: { 
                base: 'bg-green-500', 
                glow: 'shadow-[0_0_10px_rgba(34,197,94,0.8)]',
                pulse: 'animate-pulse'
            },
            offline: { 
                base: 'bg-gray-500', 
                glow: '',
                pulse: ''
            },
            in_game: { 
                base: 'bg-purple-500', 
                glow: 'shadow-[0_0_10px_rgba(168,85,247,0.8)]',
                pulse: 'animate-pulse'
            },
            in_party: { 
                base: 'bg-yellow-500', 
                glow: 'shadow-[0_0_10px_rgba(234,179,8,0.8)]',
                pulse: 'animate-pulse'
            }
        };

        const cfg = config[status] || config.offline;
        const isOnline = status === 'online' || status === 'in_game' || status === 'in_party';

        return (
            <div className="relative flex items-center justify-center w-5 h-5">
                {isOnline && (
                    <div className={`absolute inset-0 rounded-full ${cfg.base} opacity-30 animate-ping`} />
                )}
                <Circle 
                    className={`${cfg.base} ${cfg.glow} ${cfg.pulse} fill-current relative z-10`} 
                    size={16} 
                />
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                            activeTab === 'friends' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Users size={20} />
                        <span>Friends</span>
                        {friends.length > 0 && (
                            <span className="text-sm bg-purple-500/30 px-2 rounded-full">
                                {friends.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                            activeTab === 'search' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Search size={20} />
                        <span>Add Friends</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                            activeTab === 'requests' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Bell size={20} />
                        <span>Requests</span>
                        {requests.length > 0 && (
                            <span className="text-sm bg-purple-500/30 px-2 rounded-full">
                                {requests.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeTab !== 'search' && (
                <>
                    <form onSubmit={handleSendRequest} className="mb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newFriendUsername}
                                onChange={(e) => setNewFriendUsername(e.target.value)}
                                placeholder="Enter username to add friend"
                                className="flex-1 bg-black/50 border border-purple-500/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                                type="submit"
                                disabled={!newFriendUsername.trim()}
                                className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>
                    </form>

                    {error && (
                        <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-500/30">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </>
            )}

            <AnimatePresence mode="wait">
                {activeTab === 'friends' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-2"
                    >
                        {friends.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">
                                No friends yet. Add some friends to play with!
                            </p>
                        ) : (
                            friends.map(friend => (
                                <motion.div
                                    key={friend.id}
                                    className="flex items-center justify-between bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar 
                                            user={friend} 
                                            size="md" 
                                            showStatus={true}
                                            showBorder={true}
                                            theme={friend.theme || 'cosmic'}
                                        />
                                        <div className="flex-1">
                                            <span className="text-white font-medium">{friend.display_name || friend.username}</span>
                                            <div className="text-sm text-gray-400">@{friend.username}</div>
                                            {friend.vs_record && (
                                                <div className="flex items-center gap-2 text-xs mt-1">
                                                    <span className="text-green-400">W: {friend.vs_record.wins || 0}</span>
                                                    <span className="text-red-400">L: {friend.vs_record.losses || 0}</span>
                                                    <span className="text-gray-500">
                                                        ({friend.vs_record.wins || 0}-{friend.vs_record.losses || 0})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Clock size={14} />
                                            <span>
                                                {friend.status === 'online' 
                                                    ? 'Online now' 
                                                    : `Last seen ${new Date(friend.last_active || friend.friend_since).toLocaleDateString()}`
                                                }
                                            </span>
                                        </div>
                                        {friend.stats && (
                                            <div className="text-xs text-gray-500">
                                                {friend.stats.wins}W-{friend.stats.losses || (friend.stats.totalGames - friend.stats.wins)}L 
                                                ({friend.stats.totalGames ? Math.round((friend.stats.wins / friend.stats.totalGames) * 100) : 0}%)
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                ) : activeTab === 'search' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <FriendSearch 
                            onRequestSent={(user) => {
                                fetchFriends();
                            }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-2"
                    >
                        {requests.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">
                                No pending friend requests
                            </p>
                        ) : (
                            requests.map(request => (
                                <motion.div
                                    key={request.id}
                                    className="flex items-center justify-between bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar 
                                            user={request} 
                                            size="md" 
                                            showBorder={true}
                                            theme={request.theme || 'cosmic'}
                                        />
                                        <div>
                                            <span className="text-white font-medium">{request.display_name || request.username}</span>
                                            <div className="text-sm text-gray-400">
                                                {request.request_type === 'incoming' ? 'wants to be friends' : 'request sent'}
                                            </div>
                                        </div>
                                    </div>
                                    {request.request_type === 'incoming' && (
                                        <div className="flex items-center gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleRequestResponse(request.id, 'accept')}
                                                className="p-2 hover:bg-green-500/20 rounded-full text-green-500 transition-colors"
                                            >
                                                <Check size={18} />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleRequestResponse(request.id, 'decline')}
                                                className="p-2 hover:bg-red-500/20 rounded-full text-red-500 transition-colors"
                                            >
                                                <X size={18} />
                                            </motion.button>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FriendList; 
