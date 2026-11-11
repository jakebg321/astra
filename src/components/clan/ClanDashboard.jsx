import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    MessageCircle, 
    Trophy, 
    Settings, 
    Plus,
    Crown,
    Shield,
    Star,
    Zap,
    Target,
    Flag,
    Award,
    TrendingUp,
    Calendar,
    Bell,
    Edit,
    LogOut
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import ClanBannerEditor from './ClanBannerEditor';
import Avatar from '../ui/Avatar';
import { clansApi } from '../../services/clansApi';

const ClanDashboard = ({ clan, onLeaveClan, onUpdateClan }) => {
    const { profile } = useUser();
    const [activeTab, setActiveTab] = useState('overview');
    const [showBannerEditor, setShowBannerEditor] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [clanWars, setClanWars] = useState([]);
    const [announcements, setAnnouncements] = useState([]);

    const userRole = clan?.members?.find(m => m.user_id === profile?.id)?.role || 'member';
    const canEdit = ['leader', 'officer'].includes(userRole);

    useEffect(() => {
        if (clan?.id) {
            loadClanData();
        }
    }, [clan?.id]);

    const loadClanData = async () => {
        try {
            const [messages, wars] = await Promise.all([
                clansApi.getClanChat(clan.id),
                clansApi.getClanWars(clan.id)
            ]);
            setChatMessages(messages || []);
            setClanWars(wars || []);
        } catch (error) {
            console.error('Error loading clan data:', error);
            setChatMessages([]);
            setClanWars([]);
        }
    };

    const sendChatMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            await clansApi.sendClanChatMessage(clan.id, {
                userId: profile.id,
                message: newMessage
            });
            setNewMessage('');
            loadClanData();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const saveBanner = async (bannerData) => {
        try {
            await clansApi.updateClanBanner(clan.id, {
                userId: profile.id,
                bannerData
            });
            setShowBannerEditor(false);
            if (onUpdateClan) {
                onUpdateClan();
            }
        } catch (error) {
            console.error('Error saving banner:', error);
        }
    };

    const leaveClan = async () => {
        if (!confirm('Are you sure you want to leave this clan?')) return;

        try {
            await clansApi.leaveClan(clan.id, profile.id);
            if (onLeaveClan) {
                onLeaveClan();
            }
        } catch (error) {
            console.error('Error leaving clan:', error);
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'leader': return <Crown className="text-yellow-400" size={16} />;
            case 'officer': return <Star className="text-blue-400" size={16} />;
            default: return <Users className="text-gray-400" size={16} />;
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Shield },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'wars', label: 'Wars', icon: Trophy },
        { id: 'settings', label: 'Settings', icon: Settings, requiresPermission: true }
    ];

    return (
        <div className="clan-dashboard">
            <div className="relative mb-8">
                <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg overflow-hidden relative">
                    {clan.banner_data && (
                        <div className="absolute inset-0 opacity-80">

                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/30" />
                    
                    <div className="absolute bottom-4 left-6 flex items-end gap-4">
                        <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center border-4 border-white">
                            <Flag className="text-white" size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-3xl font-bold text-white">[{clan.tag}] {clan.name}</h1>
                                <div className="px-2 py-1 bg-purple-600 rounded text-white text-sm">
                                    Level {clan.level}
                                </div>
                            </div>
                            <p className="text-gray-200">{clan.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                                <span>{clan.member_count} / {clan.max_members} members</span>
                                <span>{clan.wins}W - {clan.losses}L</span>
                                <span>{clan.xp} XP</span>
                            </div>
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            onClick={() => setShowBannerEditor(true)}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                        >
                            <Edit size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
                {tabs.map(tab => {
                    if (tab.requiresPermission && !canEdit) return null;
                    
                    return (
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
                    );
                })}
                
                <button
                    onClick={leaveClan}
                    className="ml-auto flex items-center gap-2 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-t-lg transition-colors"
                >
                    <LogOut size={18} />
                    Leave Clan
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="text-yellow-400" size={20} />
                                    <h3 className="text-white font-bold">Clan Wars</h3>
                                </div>
                                <div className="text-2xl font-bold text-white">{clan.wins}</div>
                                <div className="text-sm text-gray-400">{clan.losses} losses</div>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="text-green-400" size={20} />
                                    <h3 className="text-white font-bold">Experience</h3>
                                </div>
                                <div className="text-2xl font-bold text-white">{clan.xp.toLocaleString()}</div>
                                <div className="text-sm text-gray-400">Level {clan.level}</div>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="text-blue-400" size={20} />
                                    <h3 className="text-white font-bold">Members</h3>
                                </div>
                                <div className="text-2xl font-bold text-white">{clan.member_count}</div>
                                <div className="text-sm text-gray-400">of {clan.max_members}</div>
                            </div>
                        </div>

                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Bell className="text-purple-400" size={20} />
                                Recent Activity
                            </h3>
                            <div className="space-y-3">
                                <div className="text-sm">
                                    <div className="text-gray-300">Nova joined the clan</div>
                                    <div className="text-gray-500">2 hours ago</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-gray-300">Won war against [NOVA]</div>
                                    <div className="text-gray-500">1 day ago</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-gray-300">Reached level 5</div>
                                    <div className="text-gray-500">3 days ago</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {clan.members?.map(member => (
                            <motion.div 
                                key={member.user_id} 
                                className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar 
                                        user={member} 
                                        size="lg" 
                                        showStatus={true}
                                        showBorder={true}
                                        theme={member.theme || 'cosmic'}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getRoleIcon(member.role)}
                                            <span className="text-white font-bold">{member.display_name || member.username}</span>
                                        </div>
                                        <div className="text-sm text-gray-400">@{member.username}</div>
                                        <span className="text-xs text-purple-400 capitalize font-medium">{member.role}</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Wins/Losses:</span>
                                        <span className="text-white">{member.wins || 0}W / {member.losses || 0}L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Contribution:</span>
                                        <span className="text-yellow-400">{member.contribution_xp || 0} XP</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Joined:</span>
                                        <span className="text-cyan-400">{new Date(member.joined_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-gray-800 rounded-lg h-96 flex flex-col">
                                <div className="p-4 border-b border-gray-700">
                                    <h3 className="text-white font-bold">Clan Chat</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className="flex gap-3">
                                            <div className="relative">
                                                <Avatar 
                                                    user={msg} 
                                                    size="sm" 
                                                    showBorder={true}
                                                    theme={msg.theme || 'cosmic'}
                                                />
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                                                    {getRoleIcon(msg.clan_role)}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">{msg.display_name || msg.username}</span>
                                                    <span className="text-xs text-purple-400 capitalize">{msg.clan_role}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(msg.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="text-gray-300">{msg.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-gray-700">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={sendChatMessage}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="text-white font-bold mb-3">Online Members</h4>
                                <div className="space-y-3">
                                    {clan.members?.slice(0, 5).map(member => (
                                        <div key={member.user_id} className="flex items-center gap-3">
                                            <Avatar 
                                                user={member} 
                                                size="xs" 
                                                showStatus={true}
                                                theme={member.theme || 'cosmic'}
                                            />
                                            <div>
                                                <div className="text-gray-300 text-sm font-medium">
                                                    {member.display_name || member.username}
                                                </div>
                                                <div className="text-xs text-gray-500">{member.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {clan.members?.length > 5 && (
                                        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
                                            +{clan.members.length - 5} more members
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'wars' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Clan Wars</h3>
                            {canEdit && (
                                <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                    <Target size={18} />
                                    Challenge Clan
                                </button>
                            )}
                        </div>
                        
                        <div className="grid gap-4">
                            {clanWars.map(war => (
                                <div key={war.id} className="bg-gray-800 p-4 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-white font-bold">
                                            [{war.challenger_tag}] vs [{war.defender_tag}]
                                        </div>
                                        <div className={`px-2 py-1 rounded text-sm ${
                                            war.status === 'completed' ? 'bg-green-600' :
                                            war.status === 'active' ? 'bg-yellow-600' :
                                            'bg-gray-600'
                                        }`}>
                                            {war.status}
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        Score: {war.challenger_score} - {war.defender_score}
                                        {war.winner_name && ` | Winner: ${war.winner_name}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showBannerEditor && (
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
                            className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
                        >
                            <ClanBannerEditor
                                initialBannerData={clan.banner_data}
                                onSave={saveBanner}
                                onClose={() => setShowBannerEditor(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClanDashboard;
