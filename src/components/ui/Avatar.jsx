import React from 'react';
import { 
    User, 
    Crown, 
    Zap, 
    Shield, 
    Star, 
    Target, 
    Rocket,
    Users
} from 'lucide-react';

const Avatar = ({ 
    user = null, 
    size = 'md', 
    showBorder = false, 
    showStatus = false,
    className = '',
    onClick = null,
    theme = 'cosmic'
}) => {
    const sizes = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8', 
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32'
    };

    const iconSizes = {
        xs: 12,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
        '2xl': 64
    };

    const themes = {
        cosmic: 'from-purple-600 to-blue-600',
        solar: 'from-orange-500 to-red-600',
        ocean: 'from-blue-500 to-teal-600',
        forest: 'from-green-500 to-emerald-600',
        royal: 'from-purple-500 to-pink-600',
        stealth: 'from-gray-600 to-slate-700'
    };

    const avatarIcons = {
        pilot1: User,
        pilot2: Crown,
        pilot3: Zap,
        pilot4: Shield,
        pilot5: Star,
        pilot6: Target,
        pilot7: Rocket,
        pilot8: Users
    };

    const getAvatarDisplay = () => {

        const avatarDebug = {
            username: user?.username || user?.name || 'NO USERNAME',
            hasUser: !!user,
            userKeys: user ? Object.keys(user) : [],

            hasCustomization: !!(user?.customization),
            customizationKeys: user?.customization ? Object.keys(user.customization) : [],
            customizationAvatarType: user?.customization?.avatarType,
            hasCustomizationAvatar: !!(user?.customization?.customAvatar),
            customizationAvatarLength: user?.customization?.customAvatar?.length || 0,
            customizationAvatarStart: user?.customization?.customAvatar?.substring(0, 50),

            directAvatarType: user?.avatar_type,
            hasDirectCustomAvatar: !!(user?.custom_avatar),
            directCustomAvatarLength: user?.custom_avatar?.length || 0,
            directCustomAvatarStart: user?.custom_avatar?.substring(0, 50),

            willTakeCustomizationPath: !!(user?.customization?.avatarType === 'custom' && user?.customization?.customAvatar),
            willTakeLegacyPath: !!(user?.avatar === 'custom' && user?.custom_avatar),
            willTakePresetPath: !(
                (user?.customization?.avatarType === 'custom' && user?.customization?.customAvatar) ||
                (user?.avatar === 'custom' && user?.custom_avatar)
            ),

            avatar: user?.avatar,
            theme: user?.customization?.theme || user?.theme || 'NO THEME',

            finalDecision: user?.customization?.avatarType === 'custom' && user?.customization?.customAvatar ? 'CUSTOMIZATION_CUSTOM' :
                          user?.avatar === 'custom' && user?.custom_avatar ? 'LEGACY_CUSTOM' : 'PRESET'
        };

        if (user?.customization?.avatarType === 'custom' && user?.customization?.customAvatar) {
            return (
                <img 
                    src={user.customization.customAvatar} 
                    alt={`${user.username}'s avatar`}
                    className={`${sizes[size]} object-cover rounded-full`}
                />
            );
        } 

        else if (user?.customization?.avatarType === 'custom' && !user?.customization?.customAvatar) {
            console.warn('Render inconsistency: custom type but no avatar data for user', user.username || user.name);
        }

        if (user?.avatar === 'custom' && user?.custom_avatar) {
            return (
                <img 
                    src={user.custom_avatar} 
                    alt={`${user.username}'s avatar`}
                    className={`${sizes[size]} object-cover rounded-full`}
                />
            );
        }

        const avatarId = user?.customization?.avatar || user?.avatar;
        const IconComponent = avatarIcons[avatarId] || User;
        const userTheme = user?.customization?.theme || user?.theme || theme;
        const gradientClass = themes[userTheme] || themes.cosmic;
        
        return (
            <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                <IconComponent className="text-white" size={iconSizes[size]} />
            </div>
        );
    };

    const getStatusIndicator = () => {
        if (!showStatus || !user?.status) return null;
        
        const isOnline = user.status === 'online' || user.status === 'in_game' || user.status === 'in_party';
        
        const statusConfig = {
            online: { 
                bg: 'bg-green-500', 
                glow: 'shadow-[0_0_12px_rgba(34,197,94,0.9)]',
                pulse: 'animate-pulse'
            },
            offline: { 
                bg: 'bg-gray-500', 
                glow: '',
                pulse: ''
            },
            in_game: { 
                bg: 'bg-purple-500', 
                glow: 'shadow-[0_0_12px_rgba(168,85,247,0.9)]',
                pulse: 'animate-pulse'
            },
            in_party: { 
                bg: 'bg-yellow-500', 
                glow: 'shadow-[0_0_12px_rgba(234,179,8,0.9)]',
                pulse: 'animate-pulse'
            }
        };

        const config = statusConfig[user.status] || statusConfig.offline;

        const statusSize = size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
        const borderSize = size === 'xs' ? 'border-2' : size === 'sm' ? 'border-[3px]' : 'border-[3px]';
        
        return (
            <div className={`absolute -bottom-1 -right-1 ${statusSize} ${config.bg} ${config.glow} ${config.pulse} rounded-full ${borderSize} border-gray-900 z-10`}>
                {isOnline && (
                    <div className="absolute inset-1 bg-white/40 rounded-full" />
                )}
            </div>
        );
    };

    const containerClass = `
        relative inline-block
        ${showBorder ? 'ring-2 ring-purple-400/50 rounded-full' : ''}
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${className}
    `.trim();

    return (
        <div className={containerClass} onClick={onClick}>
            {getAvatarDisplay()}
            {getStatusIndicator()}
        </div>
    );
};

export default Avatar;