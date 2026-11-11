import React, { useState, useRef } from 'react';
import { User, Palette, MessageSquare, Save, X, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import { resizeAvatar, shouldResizeAvatar } from '../../utils/avatarResize';

const avatarOptions = [
    { id: 'pilot1', name: 'Ace Pilot', emoji: '👨‍🚀' },
    { id: 'pilot2', name: 'Space Commander', emoji: '👩‍🚀' },
    { id: 'robot', name: 'Combat Droid', emoji: '🤖' },
    { id: 'alien', name: 'Galactic Warrior', emoji: '👽' },
    { id: 'cyborg', name: 'Enhanced Pilot', emoji: '🦾' },
    { id: 'explorer', name: 'Deep Space Explorer', emoji: '🧑‍🔬' }
];

const themeOptions = [
    { id: 'cosmic', name: 'Cosmic Blue', colors: { primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' } },
    { id: 'fire', name: 'Solar Flare', colors: { primary: '#EF4444', secondary: '#DC2626', accent: '#F87171' } },
    { id: 'nature', name: 'Nebula Green', colors: { primary: '#10B981', secondary: '#059669', accent: '#34D399' } },
    { id: 'royal', name: 'Imperial Purple', colors: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' } },
    { id: 'sunset', name: 'Star Forge', colors: { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' } },
    { id: 'ice', name: 'Cryogenic', colors: { primary: '#06B6D4', secondary: '#0891B2', accent: '#22D3EE' } }
];

const ProfileCustomization = ({ profile, onSave, onClose }) => {
    const [avatar, setAvatar] = useState(profile?.customization?.avatar || 'pilot1');
    const [bio, setBio] = useState(profile?.customization?.bio || '');
    const [status, setStatus] = useState(profile?.customization?.status || '');
    const [theme, setTheme] = useState(profile?.customization?.theme || 'cosmic');
    const [isSaving, setIsSaving] = useState(false);
    
    const [customAvatar, setCustomAvatar] = useState(profile?.customization?.customAvatar || null);
    const [customBanner, setCustomBanner] = useState(profile?.customization?.customBanner || null);
    const [avatarType, setAvatarType] = useState(profile?.customization?.avatarType || 'preset');
    
    const avatarInputRef = useRef(null);
    const bannerInputRef = useRef(null);

    const handleImageUpload = (file, type) => {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            if (type === 'avatar') {

                let finalAvatar = dataUrl;
                if (shouldResizeAvatar(dataUrl)) {
                    console.log('Resizing avatar during upload to save storage space...');
                    finalAvatar = await resizeAvatar(dataUrl);
                }
                
                setCustomAvatar(finalAvatar);
                setAvatarType('custom');
            } else if (type === 'banner') {
                setCustomBanner(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const customization = {
            avatar: avatarType === 'custom' ? 'custom' : avatar,
            bio: bio.trim(),
            status: status.trim(),
            theme,
            customAvatar,
            customBanner,
            avatarType
        };
        
        console.log('Saving customization data:', customization);
        
        try {
            await onSave(customization);
        } catch (error) {
            console.error('ProfileCustomization save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedTheme = themeOptions.find(t => t.id === theme);
    const selectedAvatar = avatarOptions.find(a => a.id === avatar);

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Customize Profile</h3>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={18} className="text-gray-400" />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <User size={18} className="text-purple-400" />
                    <span className="text-white font-medium">Avatar</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setAvatarType('preset')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatarType === 'preset'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500'
                                : 'bg-black/20 text-gray-400 border border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        Preset Avatars
                    </button>
                    <button
                        onClick={() => setAvatarType('custom')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatarType === 'custom'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500'
                                : 'bg-black/20 text-gray-400 border border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        Custom Upload
                    </button>
                </div>

                {avatarType === 'preset' && (
                    <div className="grid grid-cols-3 gap-3">
                        {avatarOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setAvatar(option.id)}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    avatar === option.id
                                        ? 'border-purple-500 bg-purple-500/20'
                                        : 'border-gray-600 bg-black/20 hover:border-gray-500'
                                }`}
                            >
                                <div className="text-2xl mb-2">{option.emoji}</div>
                                <div className="text-xs text-gray-300">{option.name}</div>
                            </button>
                        ))}
                    </div>
                )}

                {avatarType === 'custom' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 transition-colors flex flex-col items-center gap-2"
                        >
                            <Camera size={24} className="text-gray-400" />
                            <span className="text-gray-300">Upload Profile Picture</span>
                            <span className="text-xs text-gray-500">Max 5MB • PNG, JPG, GIF</span>
                        </button>
                        
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0], 'avatar')}
                            className="hidden"
                        />
                        
                        {customAvatar && (
                            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                                <img
                                    src={customAvatar}
                                    alt="Custom avatar"
                                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                                />
                                <div className="flex-1">
                                    <div className="text-white font-medium">Custom Avatar</div>
                                    <div className="text-xs text-gray-400">Ready to use</div>
                                </div>
                                <button
                                    onClick={() => setCustomAvatar(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={16} className="text-gray-400" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-purple-400" />
                    <span className="text-white font-medium">Bio</span>
                    <span className="text-gray-400 text-sm">({bio.length}/200)</span>
                </div>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="Tell other pilots about yourself..."
                    className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    rows={3}
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-purple-400" />
                    <span className="text-white font-medium">Status</span>
                    <span className="text-gray-400 text-sm">({status.length}/50)</span>
                </div>
                <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value.slice(0, 50))}
                    placeholder="Ready for combat!"
                    className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Palette size={18} className="text-purple-400" />
                    <span className="text-white font-medium">Theme</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {themeOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                                theme === option.id
                                    ? 'border-purple-500 bg-purple-500/20'
                                    : 'border-gray-600 bg-black/20 hover:border-gray-500'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: option.colors.primary }}
                                />
                                <span className="text-white text-sm">{option.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-purple-400" />
                    <span className="text-white font-medium">Profile Banner</span>
                </div>
                
                <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 transition-colors flex flex-col items-center gap-2"
                >
                    <ImageIcon size={24} className="text-gray-400" />
                    <span className="text-gray-300">Upload Banner Image</span>
                    <span className="text-xs text-gray-500">Max 5MB • PNG, JPG, GIF • 16:9 recommended</span>
                </button>
                
                <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'banner')}
                    className="hidden"
                />
                
                {customBanner && (
                    <div className="space-y-2">
                        <div className="relative w-full h-24 rounded-lg overflow-hidden border-2 border-purple-500">
                            <img
                                src={customBanner}
                                alt="Custom banner"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2">
                                <button
                                    onClick={() => setCustomBanner(null)}
                                    className="p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                                >
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400">Custom banner ready to use</div>
                    </div>
                )}
            </div>

            <div className="bg-black/20 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 pb-2">
                    <h4 className="text-white font-medium">Preview</h4>
                </div>
                
                {customBanner && (
                    <div className="relative h-20 mx-4 mb-4 rounded-lg overflow-hidden">
                        <img
                            src={customBanner}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                )}
                
                <div className="px-4 pb-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {avatarType === 'custom' && customAvatar ? (
                                <img
                                    src={customAvatar}
                                    alt="Avatar preview"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                                />
                            ) : (
                                <div className="text-3xl">{selectedAvatar?.emoji}</div>
                            )}
                        </div>
                        
                        <div className="flex-1">
                            <div className="text-white font-bold">{profile?.username}</div>
                            {status && (
                                <div 
                                    className="text-sm font-medium mb-2"
                                    style={{ color: selectedTheme?.colors.accent }}
                                >
                                    {status}
                                </div>
                            )}
                            {bio && (
                                <div className="text-gray-300 text-sm">{bio}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-3 bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ProfileCustomization;