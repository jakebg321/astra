import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Shield, 
    Plus, 
    Crown,
    Settings,
    ArrowLeft,
    Flag
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import ClanBrowser from '../components/clan/ClanBrowser';
import ClanDashboard from '../components/clan/ClanDashboard';
import { clansApi } from '../services/clansApi';

const Clans = () => {
    const { profile, updateProfile } = useUser();
    const [currentView, setCurrentView] = useState('browser');
    const [userClan, setUserClan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        tag: '',
        description: '',
        isPublic: true,
        maxMembers: 50
    });

    useEffect(() => {
        loadUserClan();
    }, [profile?.id]);

    const loadUserClan = async () => {
        if (!profile?.id) return;

        try {
            setLoading(true);
            const clan = await clansApi.getUserClan(profile.id);
            setUserClan(clan);
            if (clan) {
                setCurrentView('dashboard');
            }
        } catch (error) {
            console.error('Error loading user clan:', error);
        } finally {
            setLoading(false);
        }
    };

    const createClan = async () => {
        if (!profile?.id) {
            alert('Please log in to create a clan');
            return;
        }

        const payload = {
            ...createForm,
            userId: profile.id
        };
        
        console.log('Creating clan with payload:', payload);

        try {
            const newClan = await clansApi.createClan(payload);
            setUserClan(newClan);
            setCurrentView('dashboard');
            setShowCreateForm(false);
            setCreateForm({
                name: '',
                tag: '',
                description: '',
                isPublic: true,
                maxMembers: 50
            });
        } catch (error) {
            console.error('Error creating clan:', error);
            alert(error.message || 'Failed to create clan');
        }
    };

    const handleJoinClan = () => {
        loadUserClan();
    };

    const handleLeaveClan = () => {
        setUserClan(null);
        setCurrentView('browser');
    };

    const handleUpdateClan = () => {
        loadUserClan();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading clan information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Shield className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Clan System</h1>
                            <p className="text-gray-400">
                                {userClan ? `Welcome to [${userClan.tag}] ${userClan.name}` : 'Find or create your clan'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {userClan && currentView === 'dashboard' && (
                            <button
                                onClick={() => setCurrentView('browser')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                <ArrowLeft size={18} />
                                Browse Clans
                            </button>
                        )}
                        
                        {currentView === 'browser' && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                            >
                                <Plus size={20} />
                                Create Clan
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {currentView === 'browser' && (
                        <motion.div
                            key="browser"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ClanBrowser
                                onCreateClan={() => setShowCreateForm(true)}
                                onJoinClan={handleJoinClan}
                            />
                        </motion.div>
                    )}

                    {currentView === 'dashboard' && userClan && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ClanDashboard
                                clan={userClan}
                                onLeaveClan={handleLeaveClan}
                                onUpdateClan={handleUpdateClan}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Flag className="text-purple-400" size={24} />
                                <h2 className="text-xl font-bold text-white">Create New Clan</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Clan Name</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                                        placeholder="Enter clan name..."
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                                        maxLength={50}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Clan Tag (2-6 characters)</label>
                                    <input
                                        type="text"
                                        value={createForm.tag}
                                        onChange={(e) => setCreateForm({...createForm, tag: e.target.value.toUpperCase()})}
                                        placeholder="TAG"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                                        maxLength={6}
                                        minLength={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                                        placeholder="Describe your clan..."
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                                        maxLength={200}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Members</label>
                                    <select
                                        value={createForm.maxMembers}
                                        onChange={(e) => setCreateForm({...createForm, maxMembers: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value={10}>10 members</option>
                                        <option value={25}>25 members</option>
                                        <option value={50}>50 members</option>
                                        <option value={100}>100 members</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        checked={createForm.isPublic}
                                        onChange={(e) => setCreateForm({...createForm, isPublic: e.target.checked})}
                                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                    />
                                    <label htmlFor="isPublic" className="text-sm text-gray-300">
                                        Public clan (anyone can join)
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createClan}
                                    disabled={!createForm.name || !createForm.tag || createForm.tag.length < 2}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                >
                                    Create Clan
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Clans;
