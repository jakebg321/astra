import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Trophy, 
    Crown, 
    Target, 
    TrendingUp, 
    Users, 
    Loader2,
    Medal,
    Star
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const Leaderboard = () => {
    const { profile } = useUser();
    const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
    const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState('global');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLeaderboards();
    }, [profile]);

    const fetchLeaderboards = async () => {
        try {
            setIsLoading(true);
            setError('');

            const globalResponse = await fetch('/api/leaderboard/global?limit=10');
            if (globalResponse.ok) {
                const globalData = await globalResponse.json();
                setGlobalLeaderboard(globalData || []);
            } else {
                console.warn('Global leaderboard API failed');
                setGlobalLeaderboard([]);
            }

            if (profile?.id) {
                const friendsResponse = await fetch(`/api/leaderboard/friends/${profile.id}?limit=10`);
                if (friendsResponse.ok) {
                    const friendsData = await friendsResponse.json();
                    setFriendsLeaderboard(friendsData || []);
                } else {
                    console.warn('Friends leaderboard API failed');
                    setFriendsLeaderboard([]);
                }
            }
        } catch (err) {
            setError('Failed to load leaderboards');
            console.error('Error fetching leaderboards:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getRankIcon = (position) => {
        switch (position) {
            case 1:
                return <Crown className="text-yellow-400" size={24} />;
            case 2:
                return <Medal className="text-gray-300" size={24} />;
            case 3:
                return <Medal className="text-amber-600" size={24} />;
            default:
                return <span className="text-lg font-bold text-gray-400">#{position}</span>;
        }
    };

    const getRankStyle = (position) => {
        switch (position) {
            case 1:
                return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
            case 2:
                return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
            case 3:
                return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
            default:
                return 'bg-black/20 border-purple-500/20';
        }
    };

    const renderLeaderboard = (data, showFriendsOnly = false) => {
        if (data.length === 0) {
            return (
                <div className="text-center py-8">
                    <Trophy className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-400">
                        {showFriendsOnly ? 'No friends on the leaderboard yet' : 'No players ranked yet'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        {showFriendsOnly ? 'Add friends and play matches!' : 'Play matches to appear on the leaderboard!'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {data.map((player, index) => {
                    const position = index + 1;
                    const isCurrentUser = profile?.id === player.id;
                    
                    return (
                        <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-lg border ${getRankStyle(position)} ${
                                isCurrentUser ? 'ring-2 ring-purple-500' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10">
                                        {getRankIcon(position)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-semibold ${
                                                isCurrentUser ? 'text-purple-300' : 'text-white'
                                            }`}>
                                                {player.display_name || player.username}
                                            </span>
                                            {isCurrentUser && (
                                                <Star className="text-purple-400" size={16} />
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {player.total_games} game{player.total_games !== 1 ? 's' : ''} played
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-center">
                                            <div className="text-green-400 font-bold">{player.wins}W</div>
                                            <div className="text-gray-400">Wins</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-red-400 font-bold">{player.losses}L</div>
                                            <div className="text-gray-400">Losses</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-purple-400 font-bold">{player.win_rate}%</div>
                                            <div className="text-gray-400">Rate</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Trophy className="text-purple-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                </div>
                
                <button
                    onClick={fetchLeaderboards}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Refresh leaderboard"
                >
                    <TrendingUp className="text-purple-400" size={20} />
                </button>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'global' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Target size={18} />
                    <span>Global</span>
                    <span className="text-sm bg-purple-500/30 px-2 rounded-full">
                        {globalLeaderboard.length}
                    </span>
                </button>
                
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'friends' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users size={18} />
                    <span>Friends</span>
                    <span className="text-sm bg-purple-500/30 px-2 rounded-full">
                        {friendsLeaderboard.length}
                    </span>
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500/30 rounded-lg">
                    <p className="text-red-300">{error}</p>
                </div>
            )}

            <AnimatePresence mode="wait">
                {activeTab === 'global' ? (
                    <motion.div
                        key="global"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {renderLeaderboard(globalLeaderboard, false)}
                    </motion.div>
                ) : (
                    <motion.div
                        key="friends"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {renderLeaderboard(friendsLeaderboard, true)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Leaderboard;