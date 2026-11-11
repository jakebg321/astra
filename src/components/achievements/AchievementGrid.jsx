import React from 'react';
import AchievementBadge from './AchievementBadge';

const defaultAchievements = [
    {
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first match',
        category: 'first_win',
        condition_type: 'wins',
        condition_value: 1,
        points: 10
    },
    {
        id: 'veteran',
        name: 'Space Veteran',
        description: 'Play 10 matches',
        category: 'veteran',
        condition_type: 'games_played',
        condition_value: 10,
        points: 25
    },
    {
        id: 'win_streak_3',
        name: 'Hot Streak',
        description: 'Win 3 matches in a row',
        category: 'win_streak',
        condition_type: 'win_streak',
        condition_value: 3,
        points: 50
    },
    {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        description: 'Win 5 matches',
        category: 'sharpshooter',
        condition_type: 'wins',
        condition_value: 5,
        points: 30
    },
    {
        id: 'elite_pilot',
        name: 'Elite Pilot',
        description: 'Win 25 matches',
        category: 'elite',
        condition_type: 'wins',
        condition_value: 25,
        points: 100
    },
    {
        id: 'combat_master',
        name: 'Combat Master',
        description: 'Win 50 matches',
        category: 'combat',
        condition_type: 'wins',
        condition_value: 50,
        points: 200
    }
];

const AchievementGrid = ({ userStats = {}, unlockedAchievements = [], showProgress = true }) => {
    const checkAchievementProgress = (achievement) => {
        const { condition_type, condition_value } = achievement;
        let currentValue = 0;

        switch (condition_type) {
            case 'wins':
                currentValue = userStats.wins || 0;
                break;
            case 'games_played':
                currentValue = userStats.totalGames || 0;
                break;
            case 'win_streak':
                currentValue = userStats.currentWinStreak || 0;
                break;
            default:
                currentValue = 0;
        }

        const progress = Math.min((currentValue / condition_value) * 100, 100);
        return { progress, currentValue, targetValue: condition_value };
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Achievements</h3>
                <div className="text-sm text-gray-400">
                    {unlockedAchievements.length} / {defaultAchievements.length}
                </div>
            </div>
            
            <div className="grid grid-cols-6 gap-4">
                {defaultAchievements.map((achievement) => {
                    const isUnlocked = unlockedAchievements.includes(achievement.id);
                    const { progress } = checkAchievementProgress(achievement);
                    
                    return (
                        <AchievementBadge
                            key={achievement.id}
                            achievement={achievement}
                            unlocked={isUnlocked}
                            showProgress={showProgress}
                            progress={progress}
                            size="md"
                        />
                    );
                })}
            </div>
            
            <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Achievement Points</span>
                    <span className="text-yellow-400 font-bold">
                        {unlockedAchievements.reduce((total, achievementId) => {
                            const achievement = defaultAchievements.find(a => a.id === achievementId);
                            return total + (achievement?.points || 0);
                        }, 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AchievementGrid;