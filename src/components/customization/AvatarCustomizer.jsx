import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    Save,
    RotateCcw,
    User,
    Camera,
    Palette,
    Crown,
    Zap,
    Shield,
    Star,
    Target,
    Rocket
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

const AvatarCustomizer = ({ onSave, onClose }) => {
    const { profile, updateProfile } = useUser();
    const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || 'pilot1');
    const [customImage, setCustomImage] = useState(null);
    const [uploadMode, setUploadMode] = useState(false);
    const fileInputRef = useRef(null);

    const presetAvatars = [
        { id: 'pilot1', name: 'Pilot Alpha', icon: User, color: 'from-blue-500 to-cyan-500', description: 'Classic space pilot' },
        { id: 'pilot2', name: 'Ace Commander', icon: Crown, color: 'from-purple-500 to-pink-500', description: 'Elite commander' },
        { id: 'pilot3', name: 'Storm Trooper', icon: Zap, color: 'from-yellow-500 to-orange-500', description: 'Lightning warrior' },
        { id: 'pilot4', name: 'Guardian', icon: Shield, color: 'from-green-500 to-teal-500', description: 'Protective defender' },
        { id: 'pilot5', name: 'Star Ranger', icon: Star, color: 'from-indigo-500 to-purple-500', description: 'Cosmic explorer' },
        { id: 'pilot6', name: 'Sniper Elite', icon: Target, color: 'from-red-500 to-pink-500', description: 'Precision specialist' },
        { id: 'pilot7', name: 'Rocket Ace', icon: Rocket, color: 'from-orange-500 to-red-500', description: 'Speed demon' },
        { id: 'pilot8', name: 'Void Walker', icon: User, color: 'from-gray-500 to-slate-600', description: 'Shadow operative' }
    ];

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be smaller than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                setCustomImage(e.target.result);
                setSelectedAvatar('custom');
            };
            reader.readAsDataURL(file);
        }
    };

    const saveAvatar = async () => {
        try {
            const avatarData = {
                avatar: selectedAvatar,
                custom_avatar: selectedAvatar === 'custom' ? customImage : null
            };

            await updateProfile(avatarData);
            
            if (onSave) {
                onSave(avatarData);
            }
            
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Error saving avatar:', error);
            alert('Failed to save avatar');
        }
    };

    const resetToDefault = () => {
        setSelectedAvatar('pilot1');
        setCustomImage(null);
        setUploadMode(false);
    };

    const getAvatarDisplay = (avatarId) => {
        if (avatarId === 'custom' && customImage) {
            return (
                <img 
                    src={customImage} 
                    alt="Custom avatar" 
                    className="w-full h-full object-cover rounded-full"
                />
            );
        }
        
        const preset = presetAvatars.find(a => a.id === avatarId);
        if (preset) {
            return (
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${preset.color} flex items-center justify-center`}>
                    <preset.icon className="text-white" size={32} />
                </div>
            );
        }
        
        return (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                <User className="text-white" size={32} />
            </div>
        );
    };

    return (
        <div className="avatar-customizer bg-gray-900 rounded-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Camera className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Avatar Customizer</h2>
                        <p className="text-gray-400">Choose your pilot identity</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={resetToDefault}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    <button
                        onClick={saveAvatar}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        <Save size={16} />
                        Save Avatar
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-bold text-white mb-4">Preview</h3>
                        
                        <div className="w-32 h-32 mx-auto mb-4">
                            {getAvatarDisplay(selectedAvatar)}
                        </div>
                        
                        <div className="text-center">
                            {selectedAvatar === 'custom' ? (
                                <div>
                                    <h4 className="text-white font-bold">Custom Avatar</h4>
                                    <p className="text-gray-400 text-sm">Your uploaded image</p>
                                </div>
                            ) : (
                                (() => {
                                    const preset = presetAvatars.find(a => a.id === selectedAvatar);
                                    return preset ? (
                                        <div>
                                            <h4 className="text-white font-bold">{preset.name}</h4>
                                            <p className="text-gray-400 text-sm">{preset.description}</p>
                                        </div>
                                    ) : null;
                                })()
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Upload size={18} />
                                Upload Custom Image
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Max 5MB • JPG, PNG, GIF
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-4">Preset Avatars</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {presetAvatars.map(avatar => (
                            <motion.button
                                key={avatar.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedAvatar(avatar.id)}
                                className={`p-4 rounded-lg transition-all ${
                                    selectedAvatar === avatar.id
                                        ? 'bg-purple-600 ring-2 ring-purple-400'
                                        : 'bg-gray-800 hover:bg-gray-700'
                                }`}
                            >
                                <div className="w-16 h-16 mx-auto mb-2">
                                    {getAvatarDisplay(avatar.id)}
                                </div>
                                <h4 className="text-white font-medium text-sm text-center">
                                    {avatar.name}
                                </h4>
                                <p className="text-gray-400 text-xs text-center mt-1">
                                    {avatar.description}
                                </p>
                            </motion.button>
                        ))}
                        
                        {customImage && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedAvatar('custom')}
                                className={`p-4 rounded-lg transition-all ${
                                    selectedAvatar === 'custom'
                                        ? 'bg-purple-600 ring-2 ring-purple-400'
                                        : 'bg-gray-800 hover:bg-gray-700'
                                }`}
                            >
                                <div className="w-16 h-16 mx-auto mb-2">
                                    {getAvatarDisplay('custom')}
                                </div>
                                <h4 className="text-white font-medium text-sm text-center">
                                    Custom
                                </h4>
                                <p className="text-gray-400 text-xs text-center mt-1">
                                    Your upload
                                </p>
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarCustomizer;