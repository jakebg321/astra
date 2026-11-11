import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Gamepad,
    Loader2,
    Shield,
    Target,
    Zap,
    AlertTriangle,
    CheckCircle,
    Play
} from 'lucide-react';

import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '../components/ui/alert';
import UsernameRegistration from '../components/user/UsernameRegistration';
import Leaderboard from '../components/Leaderboard';
import BackgroundVideo from '../components/BackgroundVideo';
import ProfileRequiredModal from '../components/ProfileRequiredModal';
import ProfileClanDropdown from '../components/ProfileClanDropdown';



window.gameAssetsPreloaded = window.gameAssetsPreloaded || {
    backgroundVideo: false,
    hyperVideo: false,
    shipModel: false,
    planetTextures: false
};


const Home = () => {
    const {
        profile,
        isLoading,
        error,
        clearError
    } = useUser();

    const [showProfileModal, setShowProfileModal] = useState(false);



    const navigate = useNavigate();

    const [showRegistration, setShowRegistration] = React.useState(false);
    const [preloadStatus, setPreloadStatus] = React.useState('');


    React.useEffect(() => {
        setPreloadStatus('');
    }, []);

    React.useEffect(() => {
        return () => clearError();
    }, [clearError]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black z-30">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <div className="text-cyan-400 font-mono text-sm">INITIALIZING SYSTEMS...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative z-10">
            <BackgroundVideo
                speed={0.3}
                brightness={0.4}
                contrast={1.2}
                overlay={0.5}
            />

            <div className="container mx-auto px-4 py-6 md:py-10 relative z-20">
                <div className="flex flex-col items-center justify-start min-h-[calc(100dvh-4rem)] pt-4 md:pt-6">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mb-8 sm:mb-12 z-20 px-4"
                    >
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border-2 border-cyan-500/50 flex items-center justify-center tactical-border">
                                <Target className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl sm:text-6xl font-bold tactical-title glitch" data-text="ASTRA">
                                    ASTRA
                                </h1>
                                <div className="text-cyan-400 font-mono text-xs sm:text-sm mt-1 sm:mt-2">
                                    [SPACE.COMBAT.COMMAND]
                                </div>
                            </div>
                        </div>

                        <div className="hud-panel p-4 sm:p-6 max-w-2xl mx-auto scan-line">
                            <p className="text-base sm:text-lg tactical-text text-center">
                                TACTICAL COMBAT OPERATIONS CENTER
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-2">
                                Two-player browser space combat
                            </p>
                        </div>
                    </motion.div>


                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl mb-6"
                        >
                            <Alert variant="destructive" className="hud-panel border-red-500/50 bg-red-900/20">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-red-300 font-mono">{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-6xl mb-12 z-30"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="hud-panel p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 text-green-400" />
                                    <h2 className="text-xl font-bold tactical-title">PILOT STATUS</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 font-mono">CALLSIGN:</span>
                                        <span className="text-cyan-300 font-bold">{profile?.username || 'TestPilot'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 font-mono">STATUS:</span>
                                        <span className="text-green-400 font-mono status-online">ACTIVE</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hud-panel p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Target className="w-6 h-6 text-orange-400" />
                                    <h2 className="text-xl font-bold tactical-title">MISSION CONTROL</h2>
                                </div>
                                <div className="space-y-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/game')}
                                        className="w-full bg-gradient-to-r from-red-600/80 to-orange-600/80 hover:from-red-500 hover:to-orange-500 border border-orange-500/50 text-white font-bold py-6 px-6 transition-all flex items-center justify-center gap-3 tactical-btn text-lg"
                                    >
                                        <Play size={24} />
                                        <span>ENTER COMBAT</span>
                                    </motion.button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => navigate('/clans')}
                                            className="py-2 px-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 text-gray-300 text-xs font-bold transition-colors"
                                        >
                                            CLANS
                                        </button>
                                        <button
                                            onClick={() => navigate('/friends')}
                                            className="py-2 px-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 text-gray-300 text-xs font-bold transition-colors"
                                        >
                                            PILOTS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </motion.div>


                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="w-full max-w-6xl mb-12 z-30"
                    >
                        <Leaderboard />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl z-20"
                    >
                        {[
                            {
                                title: 'RAPID DEPLOYMENT',
                                description: 'Instant pilot registration system',
                                icon: CheckCircle,
                                status: 'online'
                            },
                            {
                                title: 'SECURE LOGIN',
                                description: 'Username and password sign-in',
                                icon: Shield,
                                status: 'online'
                            },
                            {
                                title: 'COMBAT READY',
                                description: 'Immediate arena access',
                                icon: Zap,
                                status: 'online'
                            }
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="hud-panel p-6 text-center"
                            >
                                <feature.icon className={`w-8 h-8 mx-auto mb-3 ${feature.status === 'online' ? 'text-green-400' : 'text-orange-400'
                                    }`} />
                                <h3 className="text-lg font-bold tactical-title mb-2">
                                    {feature.title}
                                </h3>
                                <p className="tactical-text text-sm">{feature.description}</p>
                                <div className={`text-xs font-mono mt-2 ${feature.status === 'online' ? 'text-green-400' : 'text-orange-400'
                                    }`}>
                                    [{feature.status.toUpperCase()}]
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {preloadStatus && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed bottom-4 right-4 hud-panel p-3 flex items-center gap-3"
                        >
                            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            <span className="text-cyan-400 font-mono text-sm">{preloadStatus}</span>
                        </motion.div>
                    )}
                </div>
            </div>

            {showRegistration && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="hud-panel p-8 max-w-md w-full mx-4"
                    >
                        <UsernameRegistration onClose={() => setShowRegistration(false)} />
                    </motion.div>
                </div>
            )}

            <ProfileRequiredModal
                isOpen={showProfileModal}
                isOptional={true}
                onProfileCreated={() => {
                    setShowProfileModal(false);
                }}
                onClose={() => setShowProfileModal(false)}
            />
        </div>
    );
};

export default Home;
