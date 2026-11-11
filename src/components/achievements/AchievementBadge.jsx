import React from 'react';
import { Trophy, Target, Users, Zap, Star, Shield, Swords } from 'lucide-react';

const achievementIcons = {
    first_win: Trophy,
    win_streak: Zap,
    veteran: Shield,
    sharpshooter: Target,
    social: Users,
    elite: Star,
    combat: Swords
};

const AchievementBadge = ({ achievement, unlocked = false, size = 'md', showProgress = false, progress = 0 }) => {
    const IconComponent = achievementIcons[achievement.category] || Trophy;
    
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };
    
    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24
    };

    return (
        <div className={`relative group ${sizeClasses[size]}`}>
            <div className={`
                w-full h-full rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${unlocked 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                    : 'bg-black/30 border-gray-600/50 grayscale'
                }
                ${showProgress && !unlocked ? 'relative overflow-hidden' : ''}
                group-hover:scale-110 group-hover:shadow-xl
            `}>
                <IconComponent 
                    size={iconSizes[size]} 
                    className={unlocked ? 'text-yellow-400' : 'text-gray-500'} 
                />
                

                {showProgress && !unlocked && (
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/30 to-transparent transition-all duration-500"
                            style={{ height: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
            
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-gray-300">{achievement.description}</div>
                    {showProgress && !unlocked && (
                        <div className="text-blue-400 mt-1">
                            Progress: {Math.round(progress)}%
                        </div>
                    )}
                    {achievement.points && (
                        <div className="text-yellow-400 mt-1">
                            +{achievement.points} points
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AchievementBadge;