import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Target,
    Users,
    TrendingUp,
    Crown,
    Medal,
    Star,
    BarChart3,
    Calendar,
    Zap,
    Shield,
    Award,
    User
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import StatsTracker from '../components/stats/StatsTracker';
import Avatar from '../components/ui/Avatar';

const StatsPage = () => {
    const { profile } = useUser();
    const [activeTab, setActiveTab] = useState('personal');
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardCategory, setLeaderboardCategory] = useState('wins');
    const [loading, setLoading] = useState(false);
    const [globalStats, setGlobalStats] = useState(null);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            loadLeaderboard();
        } else if (activeTab === 'global') {
            loadGlobalStats();
        }
    }, [activeTab, leaderboardCategory]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/stats/leaderboard?category=${leaderboardCategory}&limit=50`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboard(data);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadGlobalStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/stats/global');
            if (response.ok) {
                const data = await response.json();
                setGlobalStats(data);
            }
        } catch (error) {
            console.error('Error loading global stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="text-yellow-400" size={20} />;
        if (rank === 2) return <Medal className="text-gray-300" size={20} />;
        if (rank === 3) return <Award className="text-amber-600" size={20} />;
        return <span className="text-gray-400 font-bold">#{rank}</span>;
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'border-yellow-400 bg-yellow-400/10';
        if (rank === 2) return 'border-gray-300 bg-gray-300/10';
        if (rank === 3) return 'border-amber-600 bg-amber-600/10';
        if (rank <= 10) return 'border-purple-400 bg-purple-400/10';
        return 'border-gray-600 bg-gray-700/30';
    };

    const tabs = [
        { id: 'personal', label: 'My Stats', icon: User },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'global', label: 'Global Stats', icon: BarChart3 }
    ];

    const leaderboardCategories = [
        { id: 'wins', label: 'Most Wins', icon: Trophy },
        { id: 'winrate', label: 'Win Rate', icon: Target },
        { id: 'games', label: 'Most Active', icon: Users },
        { id: 'streak', label: 'Win Streak', icon: Zap }
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Statistics Hub</h1>
                            <p className="text-gray-400">Track performance and compete with others</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white border-b-2 border-purple-400'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'personal' && (
                        <motion.div
                            key="personal"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <StatsTracker showDetailed={true} />
                        </motion.div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-wrap gap-2">
                                {leaderboardCategories.map(category => (
                                    <button
                                        key={category.id}
                                        onClick={() => setLeaderboardCategory(category.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                            leaderboardCategory === category.id
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        <category.icon size={16} />
                                        {category.label}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-gray-800 rounded-lg overflow-hidden">
                                <div className="p-6 border-b border-gray-700">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Trophy className="text-yellow-400" />
                                        Top Players - {leaderboardCategories.find(c => c.id === leaderboardCategory)?.label}
                                    </h3>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-700">
                                        {leaderboard.map((player, index) => (
                                            <motion.div
                                                key={player.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={`p-4 border-l-4 ${getRankColor(player.rank)} ${
                                                    player.id === profile?.id ? 'bg-purple-600/20' : ''
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="flex items-center justify-center w-12 h-8">
                                                                {getRankIcon(player.rank)}
                                                            </div>
                                                        </div>
                                                        <Avatar 
                                                            user={player} 
                                                            size="lg" 
                                                            showBorder={true}
                                                            showStatus={player.rank <= 3}
                                                            theme={player.theme || 'cosmic'}
                                                            className={player.rank <= 3 ? 'ring-2 ring-offset-2 ring-offset-gray-800 ' + 
                                                                (player.rank === 1 ? 'ring-yellow-400' : 
                                                                 player.rank === 2 ? 'ring-gray-300' : 'ring-amber-600') : ''}
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-white font-bold">
                                                                    {player.display_name || player.username}
                                                                </h4>
                                                                {player.id === profile?.id && (
                                                                    <span className="px-2 py-1 bg-purple-600 rounded-full text-xs">You</span>
                                                                )}
                                                                {player.rank <= 3 && (
                                                                    <div className="flex items-center">
                                                                        {player.rank === 1 && <Crown className="text-yellow-400 ml-1" size={16} />}
                                                                        {player.rank === 2 && <Medal className="text-gray-300 ml-1" size={16} />}
                                                                        {player.rank === 3 && <Award className="text-amber-600 ml-1" size={16} />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-400 text-sm">@{player.username}</p>
                                                            {player.clan_tag && (
                                                                <p className="text-purple-400 text-xs">[{player.clan_tag}]</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        {leaderboardCategory === 'wins' && (
                                                            <div>
                                                                <div className="text-2xl font-bold text-green-400">{player.wins}</div>
                                                                <div className="text-gray-400 text-sm">{player.total_games} games</div>
                                                            </div>
                                                        )}
                                                        {leaderboardCategory === 'winrate' && (
                                                            <div>
                                                                <div className="text-2xl font-bold text-blue-400">{player.win_rate}%</div>
                                                                <div className="text-gray-400 text-sm">{player.wins}W / {player.losses}L</div>
                                                            </div>
                                                        )}
                                                        {leaderboardCategory === 'games' && (
                                                            <div>
                                                                <div className="text-2xl font-bold text-purple-400">{player.total_games}</div>
                                                                <div className="text-gray-400 text-sm">{player.win_rate}% win rate</div>
                                                            </div>
                                                        )}
                                                        {leaderboardCategory === 'streak' && (
                                                            <div>
                                                                <div className="text-2xl font-bold text-yellow-400">{player.current_win_streak}</div>
                                                                <div className="text-gray-400 text-sm">current streak</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'global' && (
                        <motion.div
                            key="global"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-gray-800 rounded-lg p-6 text-center">
                                    <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                                    <div className="text-3xl font-bold text-white mb-2">1,247</div>
                                    <div className="text-gray-400">Active Players</div>
                                </div>
                                
                                <div className="bg-gray-800 rounded-lg p-6 text-center">
                                    <Target className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <div className="text-3xl font-bold text-white mb-2">15,892</div>
                                    <div className="text-gray-400">Total Matches</div>
                                </div>
                                
                                <div className="bg-gray-800 rounded-lg p-6 text-center">
                                    <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <div className="text-3xl font-bold text-white mb-2">2.4k</div>
                                    <div className="text-gray-400">Today's Matches</div>
                                </div>
                                
                                <div className="bg-gray-800 rounded-lg p-6 text-center">
                                    <TrendingUp className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                                    <div className="text-3xl font-bold text-white mb-2">+12%</div>
                                    <div className="text-gray-400">Growth This Week</div>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold text-white mb-6">Community Highlights</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                                        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                            <Crown className="text-black" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Nova holds the longest win streak!</h4>
                                            <p className="text-gray-400">Currently at 23 consecutive wins</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                                        <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center">
                                            <Target className="text-black" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Most active day: Yesterday</h4>
                                            <p className="text-gray-400">347 matches played across all game modes</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                                        <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                                            <Star className="text-black" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">New achievement unlocked!</h4>
                                            <p className="text-gray-400">"Clan Wars Master" - Win 50 clan battles</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StatsPage;