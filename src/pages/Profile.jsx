import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { 
    Trophy, 
    Swords, 
    History, 
    ArrowLeft,
    Loader2,
    RefreshCw,
    Settings,
    User
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import FriendList from '../components/friends/FriendList';
import MatchHistory from '../components/MatchHistory';
import ProfileSelector from '../components/ProfileSelector';
import AchievementGrid from '../components/achievements/AchievementGrid';
import ProfileCustomization from '../components/profile/ProfileCustomization';
import BackgroundVideo from '../components/BackgroundVideo';
import QuickLogin from '../components/QuickLogin';
import Avatar from '../components/ui/Avatar';
import Banner from '../components/ui/Banner';

const Profile = () => {
    const navigate = useNavigate();
    const { profile, isLoading, error, updateStatus, refreshProfile, updateProfile } = useUser();
    
    const [localProfile, setLocalProfile] = React.useState(profile);
    const [showCustomization, setShowCustomization] = React.useState(false);

    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);

    const handleRefreshStats = async () => {
        if (refreshProfile && localProfile) {
            await refreshProfile();
        }
    };

    const handleProfileLoad = (newProfile) => {
        setLocalProfile(newProfile);
    };

    const handleCustomizationSave = async (customization) => {
        try {
            console.log('Attempting to save customization:', customization);

            const result = await updateProfile(customization);
            console.log('Backend response:', result);
            
            const updatedProfile = {
                ...currentProfile,
                customization
            };
            setLocalProfile(updatedProfile);
            setShowCustomization(false);
            
            console.log('Customization saved successfully:', customization);
        } catch (error) {
            console.error('Failed to save customization:', error);

            const updatedProfile = {
                ...currentProfile,
                customization
            };
            setLocalProfile(updatedProfile);
            setShowCustomization(false);
            
            localStorage.setItem('astra_user_profile', JSON.stringify(updatedProfile));
            console.log('Saved to localStorage as fallback');
        }
    };

    const getProfileAvatar = () => {
        const avatarMap = {
            'pilot1': '👨‍🚀',
            'pilot2': '👩‍🚀',
            'robot': '🤖',
            'alien': '👽',
            'cyborg': '🦾',
            'explorer': '🧑‍🔬'
        };
        return avatarMap[currentProfile?.customization?.avatar] || '👨‍🚀';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    const currentProfile = localProfile || profile;

    if (!currentProfile) {
        return (
            <div className="min-h-screen relative">
                <BackgroundVideo 
                    speed={0.2}
                    brightness={0.3}
                    contrast={1.1}
                    overlay={0.6}
                />
                
                <div className="container mx-auto px-4 py-8 relative z-10">
                    <div className="flex items-center mb-8">
                        <button 
                            onClick={() => navigate('/')}
                            className="text-white hover:text-purple-300 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-3xl font-bold text-white ml-4">Profile</h1>
                    </div>

                    <div className="max-w-md mx-auto">
                        <QuickLogin />
                    </div>
                    
                    <div className="max-w-md mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/30 backdrop-blur-sm rounded-xl p-8 text-center"
                        >
                            <h2 className="text-2xl font-bold text-white mb-4">Profile Access</h2>
                            <p className="text-gray-400 mb-6">
                                Create a new profile or load an existing one
                            </p>
                            
                            <ProfileSelector onProfileLoad={handleProfileLoad} />
                            
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    const calculateWinRate = () => {
        if (!currentProfile.stats.totalGames) return 0;
        return ((currentProfile.stats.wins / currentProfile.stats.totalGames) * 100).toFixed(1);
    };

    return (
        <div className="min-h-screen relative">
            <BackgroundVideo 
                speed={0.2}
                brightness={0.3}
                contrast={1.1}
                overlay={0.6}
            />
            
            <div className="container mx-auto px-4 py-8 relative z-10">
                <div className="flex items-center mb-8">
                    <button 
                        onClick={() => navigate('/')}
                        className="text-white hover:text-purple-300 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold text-white ml-4">Profile</h1>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8"
                        >
                            <div className="bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden">
                                {currentProfile.personal_banner && (
                                    <div className="relative h-32">
                                        <Banner 
                                            user={currentProfile}
                                            height={128}
                                            width="100%"
                                            className="w-full h-full"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    </div>
                                )}
                                
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold text-white">Pilot Profile</h2>
                                        <button
                                            onClick={() => setShowCustomization(true)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                            title="Customize profile"
                                        >
                                            <Settings size={18} className="text-purple-400" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-6">
                                        <Avatar 
                                            user={currentProfile} 
                                            size="2xl" 
                                            showBorder={true}
                                            showStatus={true}
                                            theme={currentProfile.theme || 'cosmic'}
                                        />
                                        <div className="flex-1">
                                            <div className="text-white font-bold text-lg">
                                                {currentProfile.display_name || currentProfile.username}
                                            </div>
                                            <div className="text-gray-400 text-sm">@{currentProfile.username}</div>
                                            {(currentProfile.customization?.status || currentProfile.status_message) && (
                                                <div className="text-cyan-400 text-sm font-medium mt-1">
                                                    {currentProfile.customization?.status || currentProfile.status_message}
                                                </div>
                                            )}
                                            {(currentProfile.customization?.bio || currentProfile.bio) && (
                                                <div className="text-gray-300 text-sm mt-2">
                                                    {currentProfile.customization?.bio || currentProfile.bio}
                                                </div>
                                            )}
                                            {currentProfile.clan_id && (
                                                <div className="text-purple-400 text-sm mt-1">
                                                    Clan Member
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-purple-200">Callsign</span>
                                            <span className="text-white font-medium">{currentProfile.username}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-white">Statistics</h2>
                                    <button 
                                        onClick={handleRefreshStats}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        title="Refresh stats"
                                    >
                                        <RefreshCw size={18} className="text-purple-400" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="text-green-400" size={20} />
                                            <span className="text-green-200">Wins</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white">{currentProfile.stats.wins}</span>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Swords className="text-red-400" size={20} />
                                            <span className="text-red-200">Losses</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white">{currentProfile.stats.losses || (currentProfile.stats.totalGames - currentProfile.stats.wins)}</span>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="text-purple-400" size={20} />
                                            <span className="text-purple-200">Win Rate</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white">{calculateWinRate()}%</span>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Swords className="text-purple-400" size={20} />
                                            <span className="text-purple-200">Total Games</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white">{currentProfile.stats.totalGames}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-black/30 backdrop-blur-sm rounded-xl p-6"
                        >
                            <AchievementGrid 
                                userStats={currentProfile.stats}
                                unlockedAchievements={currentProfile.achievements || []}
                                showProgress={true}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <MatchHistory limit={10} />
                        </motion.div>
                    </div>


                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <FriendList />
                    </motion.div>
                </div>
            </div>

            {showCustomization && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                    >
                        <ProfileCustomization
                            profile={currentProfile}
                            onSave={handleCustomizationSave}
                            onClose={() => setShowCustomization(false)}
                        />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Profile;
