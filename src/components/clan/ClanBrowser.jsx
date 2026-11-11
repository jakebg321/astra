import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Plus, 
    Users, 
    Trophy, 
    Star, 
    Shield, 
    TrendingUp,
    Crown,
    Flag,
    Filter,
    X
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { clansApi } from '../../services/clansApi';

const ClanBrowser = ({ onCreateClan, onJoinClan }) => {
    const { profile } = useUser();
    const [clans, setClans] = useState([]);
    const [filteredClans, setFilteredClans] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        minLevel: '',
        maxLevel: '',
        minMembers: '',
        maxMembers: '',
        sortBy: 'level'
    });

    useEffect(() => {
        loadClans();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [clans, searchQuery, filters]);

    const loadClans = async () => {
        try {
            setLoading(true);
            const data = await clansApi.getPublicClans();
            setClans(data || []);
        } catch (error) {
            console.error('Error loading clans:', error);
            setClans([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...clans];

        if (searchQuery) {
            filtered = filtered.filter(clan =>
                clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                clan.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
                clan.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filters.minLevel) {
            filtered = filtered.filter(clan => clan.level >= parseInt(filters.minLevel));
        }
        if (filters.maxLevel) {
            filtered = filtered.filter(clan => clan.level <= parseInt(filters.maxLevel));
        }

        if (filters.minMembers) {
            filtered = filtered.filter(clan => clan.member_count >= parseInt(filters.minMembers));
        }
        if (filters.maxMembers) {
            filtered = filtered.filter(clan => clan.member_count <= parseInt(filters.maxMembers));
        }

        filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'level':
                    return b.level - a.level;
                case 'members':
                    return b.member_count - a.member_count;
                case 'wins':
                    return b.wins - a.wins;
                case 'xp':
                    return b.xp - a.xp;
                default:
                    return b.level - a.level;
            }
        });

        setFilteredClans(filtered);
    };

    const joinClan = async (clanId) => {
        if (!profile?.id) return;

        try {
            await clansApi.joinClan(clanId, profile.id);
            alert('Successfully joined clan!');
            if (onJoinClan) {
                onJoinClan();
            }
        } catch (error) {
            console.error('Error joining clan:', error);
            alert(error.message || 'Failed to join clan');
        }
    };

    const ClanCard = ({ clan }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Flag className="text-white" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-white">[{clan.tag}] {clan.name}</h3>
                            <div className="px-2 py-1 bg-purple-600 rounded text-white text-xs">
                                Level {clan.level}
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">{clan.description}</p>
                    </div>
                </div>
                
                <button
                    onClick={() => joinClan(clan.id)}
                    disabled={clan.member_count >= clan.max_members}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        clan.member_count >= clan.max_members
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                >
                    {clan.member_count >= clan.max_members ? 'Full' : 'Join'}
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                        <Users size={16} />
                        <span className="text-sm">Members</span>
                    </div>
                    <div className="text-white font-bold">{clan.member_count}/{clan.max_members}</div>
                </div>
                
                <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                        <Trophy size={16} />
                        <span className="text-sm">Wins</span>
                    </div>
                    <div className="text-white font-bold">{clan.wins}</div>
                </div>
                
                <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-sm">XP</span>
                    </div>
                    <div className="text-white font-bold">{clan.xp.toLocaleString()}</div>
                </div>
                
                <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                        <Crown size={16} />
                        <span className="text-sm">Leader</span>
                    </div>
                    <div className="text-white font-bold text-sm">{clan.created_by_username}</div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Capacity</span>
                    <span>{Math.round((clan.member_count / clan.max_members) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(clan.member_count / clan.max_members) * 100}%` }}
                    />
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="clan-browser">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Browse Clans</h1>
                    <p className="text-gray-400">Find and join the perfect clan for your playstyle</p>
                </div>
                
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateClan}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                >
                    <Plus size={20} />
                    Create Clan
                </motion.button>
            </div>

            <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search clans by name, tag, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                            showFilters 
                                ? 'bg-purple-600 border-purple-500 text-white' 
                                : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                    >
                        <Filter size={20} />
                        Filters
                    </button>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-gray-800 border border-gray-600 rounded-lg p-4"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Min Level</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={filters.minLevel}
                                        onChange={(e) => setFilters({...filters, minLevel: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Level</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={filters.maxLevel}
                                        onChange={(e) => setFilters({...filters, maxLevel: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Min Members</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={filters.minMembers}
                                        onChange={(e) => setFilters({...filters, minMembers: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Members</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={filters.maxMembers}
                                        onChange={(e) => setFilters({...filters, maxMembers: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Sort By</label>
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    >
                                        <option value="level">Level</option>
                                        <option value="members">Members</option>
                                        <option value="wins">Wins</option>
                                        <option value="xp">Experience</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-end">
                                    <button
                                        onClick={() => setFilters({
                                            minLevel: '',
                                            maxLevel: '',
                                            minMembers: '',
                                            maxMembers: '',
                                            sortBy: 'level'
                                        })}
                                        className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between mb-6 text-gray-400">
                <span>{filteredClans.length} clans found</span>
                <span>Sorted by {filters.sortBy}</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredClans.length === 0 ? (
                <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-400 mb-2">No clans found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                    <button
                        onClick={onCreateClan}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Create the First Clan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredClans.map(clan => (
                        <ClanCard key={clan.id} clan={clan} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClanBrowser;
