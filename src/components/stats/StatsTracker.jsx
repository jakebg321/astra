import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Target,
    Clock,
    TrendingUp,
    Award,
    Star,
    Zap,
    Shield,
    Users,
    Calendar,
    BarChart3,
    LineChart
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

const StatsTracker = ({ userId, showDetailed = false }) => {
    const { profile } = useUser();
    const [stats, setStats] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFrame, setTimeFrame] = useState('all');

    useEffect(() => {
        loadStats();
        loadAchievements();
    }, [userId, timeFrame]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const targetUserId = userId || profile?.id;
            if (!targetUserId) return;

            const response = await fetch(`/api/stats/user/${targetUserId}?timeframe=${timeFrame}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAchievements = async () => {
        try {
            const targetUserId = userId || profile?.id;
            if (!targetUserId) return;

            const response = await fetch(`/api/achievements/user/${targetUserId}`);
            if (response.ok) {
                const data = await response.json();
                setAchievements(data);
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    };

    const calculateWinRate = () => {
        if (!stats || stats.total_games === 0) return 0;
        return ((stats.wins / stats.total_games) * 100).toFixed(1);
    };

    const calculateKDR = () => {
        if (!stats || stats.total_kills == null || stats.total_deaths == null) return '0.00';
        const kills = Number(stats.total_kills) || 0;
        const deaths = Number(stats.total_deaths) || 0;
        if (deaths === 0) return kills > 0 ? kills.toFixed(2) : '0.00';
        return (kills / deaths).toFixed(2);
    };

    const getPerformanceColor = (value, thresholds) => {
        if (value >= thresholds.excellent) return 'text-green-400';
        if (value >= thresholds.good) return 'text-blue-400';
        if (value >= thresholds.average) return 'text-yellow-400';
        return 'text-red-400';
    };

    const StatCard = ({ icon: Icon, label, value, subValue, color = 'text-white', trend = null }) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
        >
            <div className="flex items-center justify-between mb-2">
                <Icon className="text-purple-400" size={20} />
                {trend && (
                    <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-400 text-sm">{label}</div>
            {subValue && <div className="text-gray-500 text-xs mt-1">{subValue}</div>}
        </motion.div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center p-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No statistics available</p>
            </div>
        );
    }

    return (
        <div className="stats-tracker space-y-6">
            {showDetailed && (
                <div className="flex gap-2">
                    {[
                        { id: 'all', label: 'All Time' },
                        { id: 'month', label: 'This Month' },
                        { id: 'week', label: 'This Week' }
                    ].map(frame => (
                        <button
                            key={frame.id}
                            onClick={() => setTimeFrame(frame.id)}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${timeFrame === frame.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {frame.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Trophy}
                    label="Wins"
                    value={stats.wins || 0}
                    color="text-green-400"
                    trend={stats.win_trend}
                />
                <StatCard
                    icon={Target}
                    label="Total Games"
                    value={stats.total_games || 0}
                    subValue={`${calculateWinRate()}% win rate`}
                    color="text-blue-400"
                />
                <StatCard
                    icon={Zap}
                    label="Current Streak"
                    value={stats.current_win_streak || 0}
                    subValue={`Best: ${stats.best_win_streak || 0}`}
                    color={getPerformanceColor(stats.current_win_streak || 0, { excellent: 10, good: 5, average: 2 })}
                />
                <StatCard
                    icon={Award}
                    label="Achievements"
                    value={achievements.length}
                    subValue={`${achievements.filter(a => a.earned_recently).length} recent`}
                    color="text-yellow-400"
                />
            </div>

            {showDetailed && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Target}
                        label="Total Kills"
                        value={stats.total_kills != null ? stats.total_kills : 0}
                        color="text-red-400"
                    />
                    <StatCard
                        icon={Shield}
                        label="Deaths"
                        value={stats.total_deaths != null ? stats.total_deaths : 0}
                        subValue={`K/D: ${calculateKDR()}`}
                        color="text-gray-400"
                    />
                    <StatCard
                        icon={Clock}
                        label="Playtime"
                        value={`${Math.floor((stats.total_playtime || 0) / 60)}h`}
                        subValue={`${(stats.total_playtime || 0) % 60}m`}
                        color="text-cyan-400"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Average Score"
                        value={Math.round(stats.average_score || 0)}
                        subValue={`Best: ${stats.best_score || 0}`}
                        color="text-purple-400"
                    />
                </div>
            )}

            {showDetailed && stats.accuracy && (
                <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="text-purple-400" />
                        Performance Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Accuracy</span>
                                <span className={getPerformanceColor(stats.accuracy, { excellent: 80, good: 65, average: 50 })}>
                                    {stats.accuracy}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.accuracy}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Survival Rate</span>
                                <span className={getPerformanceColor(stats.survival_rate, { excellent: 60, good: 40, average: 25 })}>
                                    {stats.survival_rate}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.survival_rate}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Consistency</span>
                                <span className={getPerformanceColor(stats.consistency_score, { excellent: 85, good: 70, average: 55 })}>
                                    {stats.consistency_score}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.consistency_score}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {achievements.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Star className="text-yellow-400" />
                        Recent Achievements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievements.slice(0, 6).map(achievement => (
                            <motion.div
                                key={achievement.id}
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                            >
                                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <Award className="text-white" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-sm">{achievement.name}</h4>
                                    <p className="text-gray-400 text-xs">{achievement.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {showDetailed && stats.game_modes && (
                <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="text-blue-400" />
                        Game Mode Performance
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.game_modes).map(([mode, modeStats]) => (
                            <div key={mode} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                <div>
                                    <h4 className="text-white font-medium capitalize">{mode.replace('_', ' ')}</h4>
                                    <p className="text-gray-400 text-sm">
                                        {modeStats.games} games • {((modeStats.wins / modeStats.games) * 100).toFixed(1)}% win rate
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-green-400 font-bold">{modeStats.wins}W</div>
                                    <div className="text-red-400 text-sm">{modeStats.losses}L</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsTracker;