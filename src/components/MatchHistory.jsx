import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    History, 
    Trophy, 
    Skull, 
    Clock, 
    Target, 
    Loader2,
    Filter,
    Calendar
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const MatchHistory = ({ limit = 10, showFilters = true }) => {
    const { profile, refreshProfile } = useUser();
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (profile?.username) {
            fetchMatchHistory();
        }
    }, [profile, limit]);

    const fetchMatchHistory = async () => {
        try {
            setIsLoading(true);
            setError('');

            const endpoint = `/api/users/username/${profile.username}/history?limit=${limit}`;
            const response = await fetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                setMatches(data);
            } else {
                throw new Error('Failed to fetch match history');
            }
        } catch (err) {
            setError('Failed to load match history');
            console.error('Error fetching match history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredMatches = () => {
        if (filter === 'all') return matches;
        if (filter === 'wins') return matches.filter(match => match.winner_id === profile.id);
        if (filter === 'losses') return matches.filter(match => match.winner_id != null && match.winner_id !== profile.id);
        return matches;
    };

    const formatDuration = (seconds) => {
        if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) < 0) return '—';
        const wholeSeconds = Math.floor(Number(seconds));
        const minutes = Math.floor(wholeSeconds / 60);
        const remainingSeconds = wholeSeconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getMatchResult = (match) => {
        const isWin = match.winner_id === profile.id;
        const isPlayer1 = match.player1_id === profile.id;
        
        const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
        return { isWin, isDraw: match.winner_id == null, opponentName: opponentName || 'Unknown pilot' };
    };

    const filteredMatches = getFilteredMatches();
    const winCount = (matches || []).filter(match => match?.winner_id === profile?.id).length;
    const lossCount = (matches || []).filter(match => match?.winner_id != null && match.winner_id !== profile?.id).length;

    if (isLoading) {
        return (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <History className="text-purple-400" size={24} />
                    <h3 className="text-xl font-semibold text-white">Match History</h3>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-green-400 font-bold">{winCount}</div>
                        <div className="text-gray-400">Wins</div>
                    </div>
                    <div className="text-center">
                        <div className="text-red-400 font-bold">{lossCount}</div>
                        <div className="text-gray-400">Losses</div>
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="flex gap-2 mb-4">
                    {[
                        { key: 'all', label: 'All Matches', count: matches.length },
                        { key: 'wins', label: 'Wins', count: winCount },
                        { key: 'losses', label: 'Losses', count: lossCount }
                    ].map(filterOption => (
                        <button
                            key={filterOption.key}
                            onClick={() => setFilter(filterOption.key)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors text-sm ${
                                filter === filterOption.key 
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>{filterOption.label}</span>
                            <span className="bg-purple-500/30 px-2 rounded-full">
                                {filterOption.count}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500/30 rounded-lg">
                    <p className="text-red-300">{error}</p>
                </div>
            )}

            {filteredMatches.length === 0 ? (
                <div className="text-center py-8">
                    <Target className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-400">
                        {filter === 'all' ? 'No matches played yet' : 
                         filter === 'wins' ? 'No wins yet' : 'No losses yet'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Play some matches to see your history!
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredMatches.map((match, index) => {
                        const result = getMatchResult(match);
                        
                        return (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-lg border ${
                                    result.isDraw ? 'bg-gray-900/20 border-gray-500/30' : result.isWin
                                        ? 'bg-green-900/20 border-green-500/30' 
                                        : 'bg-red-900/20 border-red-500/30'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${
                                            result.isDraw ? 'bg-gray-500/20' : result.isWin ? 'bg-green-500/20' : 'bg-red-500/20'
                                        }`}>
                                            {result.isDraw ? (
                                                <History className="text-gray-400" size={20} />
                                            ) : result.isWin ? (
                                                <Trophy className="text-green-400" size={20} />
                                            ) : (
                                                <Skull className="text-red-400" size={20} />
                                            )}
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${
                                                    result.isDraw ? 'text-gray-300' : result.isWin ? 'text-green-300' : 'text-red-300'
                                                }`}>
                                                    {result.isDraw ? 'Draw' : result.isWin ? 'Victory' : 'Defeat'}
                                                </span>
                                                <span className="text-gray-400">vs</span>
                                                <span className="text-white font-medium">
                                                    {result.opponentName}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    <span>{formatDuration(match.duration)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>{formatDate(match.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MatchHistory;
