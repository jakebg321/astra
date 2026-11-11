import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Loader2, Clock, Gamepad2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useUser } from '../../contexts/UserContext';
import debounce from 'lodash/debounce';
import { friendsApi } from '../../services/friendsApi';
import { usersApi } from '../../services/usersApi';

const FriendSearch = ({ onRequestSent }) => {
    const { profile } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingRequest, setSendingRequest] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (!profile?.id) return;
        
        const fetchRecentPlayers = async () => {
            try {
                const players = await usersApi.getRecentPlayers(profile.id);
                setRecentlyPlayed(players);
            } catch (err) {
                console.error('Error fetching recent players:', err);
            }
        };

        fetchRecentPlayers();
    }, [profile?.id]);

    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            setError('');

            try {
                const users = await usersApi.searchUsers(query);

                const filtered = users.filter(user => 
                    user.id !== profile?.id && 
                    !user.is_friend
                );
                setSearchResults(filtered);
            } catch (err) {
                setError('Error searching users');
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        [profile?.id]
    );

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    const sendFriendRequest = async (targetUser) => {
        setSendingRequest(prev => ({ ...prev, [targetUser.id]: true }));
        setError('');

        try {
            await friendsApi.sendFriendRequest({
                fromUserId: profile.id,
                toUserId: targetUser.id
            });
            setSearchResults(prev => prev.filter(u => u.id !== targetUser.id));
            setRecentlyPlayed(prev => prev.filter(u => u.id !== targetUser.id));
            
            if (onRequestSent) {
                onRequestSent(targetUser);
            }
        } catch (err) {
            setError(err.message || 'Error sending friend request');
        } finally {
            setSendingRequest(prev => ({ ...prev, [targetUser.id]: false }));
        }
    };

    const UserCard = ({ user, showLastPlayed = false }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 transition-colors"
        >
            <div className="flex items-center gap-3">
                <Avatar 
                    user={user} 
                    size="md" 
                    showStatus={true}
                    theme={user.theme || 'cosmic'}
                />
                <div>
                    <div className="text-white font-medium">{user.display_name || user.username}</div>
                    <div className="text-sm text-gray-400">@{user.username}</div>
                    {showLastPlayed && user.last_played && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock size={10} />
                            Played {new Date(user.last_played).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>
            
            <button
                onClick={() => sendFriendRequest(user)}
                disabled={sendingRequest[user.id]}
                className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {sendingRequest[user.id] ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <UserPlus size={16} />
                )}
                <span className="text-sm">Add</span>
            </button>
        </motion.div>
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by username..."
                    className="w-full bg-black/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" size={20} />
                )}
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                    {error}
                </div>
            )}

            {searchQuery.length >= 2 && (
                <AnimatePresence>
                    {searchResults.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            <h3 className="text-gray-400 text-sm font-medium">Search Results</h3>
                            {searchResults.map(user => (
                                <UserCard key={user.id} user={user} />
                            ))}
                        </motion.div>
                    ) : !isSearching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-gray-400 py-4"
                        >
                            No users found matching "{searchQuery}"
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {!searchQuery && recentlyPlayed.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-gray-400 text-sm font-medium flex items-center gap-2">
                        <Gamepad2 size={16} />
                        Recently Played With
                    </h3>
                    {recentlyPlayed.map(user => (
                        <UserCard key={user.id} user={user} showLastPlayed={true} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FriendSearch;
