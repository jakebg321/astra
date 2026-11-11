
import { resizeAvatar, shouldResizeAvatar } from './avatarResize.js';

export const migrateExistingAvatars = async () => {
    try {
        const storedProfile = localStorage.getItem('astra_user_profile');
        if (!storedProfile) return;

        const profile = JSON.parse(storedProfile);
        
        const customAvatar = profile.customization?.customAvatar;
        if (!customAvatar || !shouldResizeAvatar(customAvatar)) {
            return;
        }

        console.log('Migrating existing large avatar to save storage space...');
        
        const resizedAvatar = await resizeAvatar(customAvatar);
        
        profile.customization.customAvatar = resizedAvatar;
        
        localStorage.setItem('astra_user_profile', JSON.stringify(profile));
        
        console.log('Avatar migration completed:', {
            originalSize: customAvatar.length,
            newSize: resizedAvatar.length,
            reduction: `${((customAvatar.length - resizedAvatar.length) / customAvatar.length * 100).toFixed(1)}%`
        });
        
        return true;
    } catch (error) {
        console.error('Avatar migration failed:', error);
        return false;
    }
};

export const needsAvatarMigration = () => {
    try {
        const storedProfile = localStorage.getItem('astra_user_profile');
        if (!storedProfile) {
            console.log('Avatar migration check: No stored profile found');
            return false;
        }

        const profile = JSON.parse(storedProfile);
        const customAvatar = profile.customization?.customAvatar;
        
        const needsMigration = customAvatar && shouldResizeAvatar(customAvatar);
        console.log('Avatar migration check:', {
            hasCustomAvatar: !!customAvatar,
            avatarSize: customAvatar?.length || 0,
            needsMigration
        });
        
        return needsMigration;
    } catch (error) {
        console.error('Avatar migration check error:', error);
        return false;
    }
};