import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Flag,
    Settings,
    Palette,
    Camera,
    Save,
    ArrowLeft,
    Crown,
    Shield,
    Star,
    Zap
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import AvatarCustomizer from '../components/customization/AvatarCustomizer';
import PersonalBannerEditor from '../components/customization/PersonalBannerEditor';

const ProfileCustomization = () => {
    const { profile, updateProfile } = useUser();
    const [activeSection, setActiveSection] = useState('overview');
    const [profileForm, setProfileForm] = useState({
        display_name: profile?.display_name || '',
        bio: profile?.bio || '',
        status_message: profile?.status_message || '',
        theme: profile?.theme || 'cosmic',
        privacy_profile_visible: profile?.privacy_settings?.profile_visible ?? true,
        privacy_stats_visible: profile?.privacy_settings?.stats_visible ?? true
    });

    const themes = [
        { id: 'cosmic', name: 'Cosmic', colors: 'from-purple-600 to-blue-600', description: 'Deep space vibes' },
        { id: 'solar', name: 'Solar Flare', colors: 'from-orange-500 to-red-600', description: 'Burning bright' },
        { id: 'ocean', name: 'Ocean Depths', colors: 'from-blue-500 to-teal-600', description: 'Cool and calm' },
        { id: 'forest', name: 'Forest', colors: 'from-green-500 to-emerald-600', description: 'Natural power' },
        { id: 'royal', name: 'Royal', colors: 'from-purple-500 to-pink-600', description: 'Regal elegance' },
        { id: 'stealth', name: 'Stealth', colors: 'from-gray-600 to-slate-700', description: 'Shadow operative' }
    ];

    const getAvatarDisplay = (avatarId) => {
        if (avatarId === 'custom' && profile?.custom_avatar) {
            return (
                <img 
                    src={profile.custom_avatar} 
                    alt="Custom avatar" 
                    className="w-full h-full object-cover rounded-full"
                />
            );
        }
        
        const avatarIcons = {
            pilot1: User,
            pilot2: Crown,
            pilot3: Zap,
            pilot4: Shield,
            pilot5: Star
        };
        
        const IconComponent = avatarIcons[avatarId] || User;
        const currentTheme = themes.find(t => t.id === (profile?.theme || 'cosmic'));
        
        return (
            <div className={`w-full h-full rounded-full bg-gradient-to-br ${currentTheme?.colors || 'from-purple-600 to-blue-600'} flex items-center justify-center`}>
                <IconComponent className="text-white" size={32} />
            </div>
        );
    };

    const saveProfileSettings = async () => {
        try {
            const updates = {
                display_name: profileForm.display_name,
                bio: profileForm.bio,
                status_message: profileForm.status_message,
                theme: profileForm.theme,
                privacy_settings: {
                    profile_visible: profileForm.privacy_profile_visible,
                    stats_visible: profileForm.privacy_stats_visible
                }
            };

            await updateProfile(updates);
            alert('Profile settings saved successfully!');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile settings');
        }
    };

    const sections = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'avatar', label: 'Avatar', icon: Camera },
        { id: 'banner', label: 'Banner', icon: Flag },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Palette className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Profile Customization</h1>
                            <p className="text-gray-400">Personalize your pilot identity</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors ${
                                activeSection === section.id
                                    ? 'bg-purple-600 text-white border-b-2 border-purple-400'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <section.icon size={18} />
                            {section.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeSection === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold mb-4">Profile Preview</h3>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24">
                                        {getAvatarDisplay(profile?.avatar)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold">{profile?.display_name || profile?.username}</h4>
                                        <p className="text-purple-400">@{profile?.username}</p>
                                        <p className="text-gray-400 mt-2">{profile?.bio || 'No bio set'}</p>
                                        {profile?.status_message && (
                                            <div className="mt-2 px-3 py-1 bg-purple-600/20 rounded-full inline-block">
                                                <span className="text-purple-300">{profile.status_message}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">{profile?.wins || 0}</div>
                                    <div className="text-gray-400">Wins</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-red-400">{profile?.losses || 0}</div>
                                    <div className="text-gray-400">Losses</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-400">{profile?.total_games || 0}</div>
                                    <div className="text-gray-400">Total Games</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{profile?.current_win_streak || 0}</div>
                                    <div className="text-gray-400">Win Streak</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSection === 'avatar' && (
                        <motion.div
                            key="avatar"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AvatarCustomizer />
                        </motion.div>
                    )}

                    {activeSection === 'banner' && (
                        <motion.div
                            key="banner"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PersonalBannerEditor />
                        </motion.div>
                    )}

                    {activeSection === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold mb-4">Profile Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                                        <input
                                            type="text"
                                            value={profileForm.display_name}
                                            onChange={(e) => setProfileForm({...profileForm, display_name: e.target.value})}
                                            placeholder="Your display name"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Bio</label>
                                        <textarea
                                            value={profileForm.bio}
                                            onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                                            placeholder="Tell other pilots about yourself..."
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                                            maxLength={200}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Status Message</label>
                                        <input
                                            type="text"
                                            value={profileForm.status_message}
                                            onChange={(e) => setProfileForm({...profileForm, status_message: e.target.value})}
                                            placeholder="Your current status..."
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                                            maxLength={50}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold mb-4">Profile Theme</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {themes.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setProfileForm({...profileForm, theme: theme.id})}
                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                profileForm.theme === theme.id
                                                    ? 'border-purple-400 ring-2 ring-purple-400/20'
                                                    : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                        >
                                            <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${theme.colors} mb-2`} />
                                            <h4 className="text-white font-bold">{theme.name}</h4>
                                            <p className="text-gray-400 text-sm">{theme.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold mb-4">Privacy Settings</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white font-medium">Profile Visibility</h4>
                                            <p className="text-gray-400 text-sm">Allow other players to view your profile</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={profileForm.privacy_profile_visible}
                                            onChange={(e) => setProfileForm({...profileForm, privacy_profile_visible: e.target.checked})}
                                            className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white font-medium">Stats Visibility</h4>
                                            <p className="text-gray-400 text-sm">Show your game statistics publicly</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={profileForm.privacy_stats_visible}
                                            onChange={(e) => setProfileForm({...profileForm, privacy_stats_visible: e.target.checked})}
                                            className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={saveProfileSettings}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                                >
                                    <Save size={18} />
                                    Save Settings
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProfileCustomization;