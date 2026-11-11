import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { migrateExistingAvatars, needsAvatarMigration } from '../utils/avatarMigration';

const UserContext = createContext(null);

const ProfileValidation = {
    username: {
        minLength: 3,
        maxLength: 16,
        pattern: /^[a-zA-Z0-9_-]+$/,
        messages: {
            required: 'Username is required',
            minLength: 'Username must be at least 3 characters',
            maxLength: 'Username must be 16 characters or less',
            pattern: 'Username can only contain letters, numbers, hyphens, and underscores'
        }
    }
};

export const UserProvider = ({ children }) => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatProfile = useCallback((userData) => {
        const banner = userData.personal_banner;
        const isCanvasBanner = typeof banner === 'object' ||
            (typeof banner === 'string' && /^[{[]/.test(banner.trim()));
        return {
            ...userData,
            stats: {
                totalGames: userData.total_games,
                wins: userData.wins,
                losses: userData.losses
            },
            customization: {
                avatar: userData.avatar,
                customAvatar: userData.custom_avatar,
                customBanner: isCanvasBanner ? null : banner,
                bio: userData.bio,
                status: userData.status_message,
                theme: userData.theme,
                avatarType: userData.avatar_type ||
                    (userData.avatar === 'custom' || userData.custom_avatar ? 'custom' : 'preset')
            }
        };
    }, []);

    useEffect(() => {
        const initializeProfile = async () => {
            console.log('Checking for user session...');

            if (needsAvatarMigration()) {
                console.log('Avatar migration needed, running migration...');
                await migrateExistingAvatars();
            }

            try {
                const response = await fetch('/api/auth/me', { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    const formattedProfile = formatProfile(data.user);
                    console.log('Cookie session restored:', formattedProfile.username);
                    setProfileWithPersistence(formattedProfile);
                    setIsLoading(false);
                    return;
                }

                if (response.status === 401) {
                    localStorage.removeItem('astra_user_profile');
                }
            } catch {

            }

            const storedProfile = localStorage.getItem('astra_user_profile');
            if (storedProfile) {
                try {
                    const parsedProfile = JSON.parse(storedProfile);
                    console.log('Restoring user session from localStorage:', parsedProfile.username);
                    setProfile(parsedProfile);
                } catch (error) {
                    console.error('Failed to restore user session:', error);
                    localStorage.removeItem('astra_user_profile');
                }
            } else {
                console.log('No stored user session found');
            }
            setIsLoading(false);
        };

        initializeProfile();
    }, []);

    const setProfileWithPersistence = useCallback((newProfile) => {
        setProfile(newProfile);
        if (newProfile) {
            localStorage.setItem('astra_user_profile', JSON.stringify(newProfile));
            console.log('User session saved:', newProfile.username);
        } else {
            localStorage.removeItem('astra_user_profile');
            console.log('User session cleared');
        }
    }, []);

    const validateUsername = useCallback((username) => {
        if (!username) {
            return ProfileValidation.username.messages.required;
        }
        if (username.length < ProfileValidation.username.minLength) {
            return ProfileValidation.username.messages.minLength;
        }
        if (username.length > ProfileValidation.username.maxLength) {
            return ProfileValidation.username.messages.maxLength;
        }
        if (!ProfileValidation.username.pattern.test(username)) {
            return ProfileValidation.username.messages.pattern;
        }
        return null;
    }, []);

    const setProfileFromAuth = useCallback((userData) => {
        const formattedProfile = formatProfile(userData);
        setProfileWithPersistence(formattedProfile);
        return formattedProfile;
    }, [formatProfile, setProfileWithPersistence]);

    const authenticateUser = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/users/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Invalid credentials');
            }

            const authData = await response.json();
            const formattedProfile = formatProfile(authData);
            setProfileWithPersistence(formattedProfile);
            return formattedProfile;

        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [formatProfile, setProfileWithPersistence]);

    const createProfile = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);

        try {
            const validationError = validateUsername(username);
            if (validationError) {
                throw new Error(validationError);
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username,
                    password
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create profile');
            }

            const data = await response.json();
            const formattedProfile = formatProfile(data.user);
            setProfileWithPersistence(formattedProfile);
            return formattedProfile;

        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [validateUsername, formatProfile, setProfileWithPersistence]);

    const loadProfile = useCallback(async (identifier) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/${identifier}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setProfileWithPersistence(null);
                    return null;
                }
                throw new Error('Failed to load profile');
            }

            const loadedProfile = await response.json();
            const formattedProfile = formatProfile(loadedProfile);
            setProfileWithPersistence(formattedProfile);
            return formattedProfile;

        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [formatProfile, setProfileWithPersistence]);

    const updateProfile = useCallback(async (updates) => {
        if (!profile) return;
        setIsLoading(true);
        setError(null);

        try {
            const endpoint = `/api/users/username/${profile.username}`;

            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();
            const formattedProfile = formatProfile(updatedProfile);
            setProfileWithPersistence(formattedProfile);
            return formattedProfile;

        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [profile, formatProfile, setProfileWithPersistence]);

    const updateStatus = useCallback(async (newStatus) => {
        if (!profile) return;
        return updateProfile({
            status: newStatus,
            last_active: new Date().toISOString()
        });
    }, [profile, updateProfile]);

    const refreshProfile = useCallback(async () => {
        if (!profile) return;

        return await loadProfile(profile.username);
    }, [profile, loadProfile]);

    const clearProfile = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch {   }
        setProfileWithPersistence(null);
        setError(null);
    }, [setProfileWithPersistence]);

    useEffect(() => {
        if (profile && profile.status !== 'online') {
            const setOnlineStatus = async () => {
                try {
                    await updateStatus('online');
                } catch (error) {
                    console.log('Failed to set online status:', error);

                }
            };
            setOnlineStatus();
        }
    }, [profile?.username]);

    const value = {
        profile,
        isLoading,
        error,
        authenticateUser,
        login: authenticateUser,
        createProfile,
        loadProfile,
        updateProfile,
        updateStatus,
        refreshProfile,
        clearProfile,
        logout: clearProfile,
        setProfileFromAuth,
        clearError: () => setError(null)
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export default UserContext;
