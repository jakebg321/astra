import React, { useState, useEffect } from 'react';
import { Search, Loader2, User, UserPlus, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const ProfileSelector = ({ onProfileLoad }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('load');
    const [usernameStatus, setUsernameStatus] = useState('');
    const [recentProfiles, setRecentProfiles] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        const recent = localStorage.getItem('astra_recent_profiles');
        if (recent) {
            try {
                setRecentProfiles(JSON.parse(recent));
            } catch (e) {
                console.warn('Failed to parse recent profiles');
            }
        }
    }, []);

    useEffect(() => {
        if (mode === 'create' && identifier.trim().length >= 3) {
            const checkAvailability = async () => {
                setUsernameStatus('checking');
                try {
                    const response = await fetch(`/api/users/${identifier.trim()}`);
                    if (response.status === 404) {
                        setUsernameStatus('available');
                    } else if (response.ok) {
                        setUsernameStatus('taken');
                        const baseName = identifier.trim();
                        setSuggestions([
                            `${baseName}${Math.floor(Math.random() * 100)}`,
                            `${baseName}_${Math.floor(Math.random() * 100)}`,
                            `${baseName}${Math.floor(Math.random() * 1000)}`,
                        ]);
                    }
                } catch (err) {
                    setUsernameStatus('');
                }
            };

            const debounceTimer = setTimeout(checkAvailability, 500);
            return () => clearTimeout(debounceTimer);
        } else {
            setUsernameStatus('');
            setSuggestions([]);
        }
    }, [identifier, mode]);

    const saveRecentProfile = (profile) => {
        const recent = recentProfiles.filter(p => p.username !== profile.username);
        const updated = [profile, ...recent].slice(0, 5);
        setRecentProfiles(updated);
        localStorage.setItem('astra_recent_profiles', JSON.stringify(updated));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) return;
        if (mode === 'create' && !password.trim()) {
            setError('Password is required');
            return;
        }

        if (mode === 'create') {
            await handleCreateProfile();
        } else {
            await handleLoadProfile();
        }
    };

    const handleLoadProfile = async () => {
        setIsLoading(true);
        setError('');

        try {
            let response;
            if (password.trim()) {
                response = await fetch('/api/users/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: identifier.trim(),
                        password: password.trim()
                    }),
                });
            } else {

                response = await fetch(`/api/users/${identifier.trim()}`);
            }
            
            if (!response.ok) {
                if (response.status === 404) {
                    setError('User not found');
                } else if (response.status === 401) {
                    setError('Invalid password');
                } else {
                    setError('Failed to load profile');
                }
                return;
            }

            const userData = await response.json();
            
            const formattedProfile = {
                ...userData,
                stats: {
                    totalGames: userData.total_games,
                    wins: userData.wins,
                    losses: userData.losses,
                    currentWinStreak: userData.current_win_streak || 0
                },
                achievements: userData.achievements || []
            };
            
            onProfileLoad(formattedProfile);
            saveRecentProfile(formattedProfile);
            setPassword('');
            
        } catch (err) {
            setError('Failed to load profile');
            console.error('Profile load error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProfile = async () => {
        setIsCreating(true);
        setError('');

        try {
            const username = identifier.trim();
            if (username.length < 3) {
                setError('Username must be at least 3 characters');
                return;
            }
            if (username.length > 16) {
                setError('Username must be 16 characters or less');
                return;
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                setError('Username can only contain letters, numbers, hyphens, and underscores');
                return;
            }

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password.trim(),
                    display_name: username
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to create profile');
                return;
            }

            const newUser = await response.json();
            
            const formattedProfile = {
                ...newUser,
                stats: {
                    totalGames: newUser.total_games,
                    wins: newUser.wins,
                    losses: newUser.losses,
                    currentWinStreak: newUser.current_win_streak || 0
                },
                achievements: newUser.achievements || []
            };
            
            onProfileLoad(formattedProfile);
            saveRecentProfile(formattedProfile);
            setIdentifier('');
            setPassword('');
            
        } catch (err) {
            setError('Failed to create profile');
            console.error('Profile creation error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const getUsernameStatusIcon = () => {
        switch (usernameStatus) {
            case 'checking':
                return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
            case 'available':
                return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'taken':
                return <AlertCircle className="w-4 h-4 text-red-400" />;
            default:
                return null;
        }
    };

    const getUsernameStatusText = () => {
        switch (usernameStatus) {
            case 'checking':
                return 'Checking availability...';
            case 'available':
                return 'Username available!';
            case 'taken':
                return 'Username already taken';
            default:
                return '';
        }
    };

    return (
        <div className="space-y-6">
            {recentProfiles.length > 0 && mode === 'load' && (
                <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">Recent Profiles</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {recentProfiles.map((profile) => (
                            <button
                                key={profile.username}
                                onClick={() => {
                                    setIdentifier(profile.username);
                                    handleLoadProfile();
                                }}
                                className="flex items-center justify-between p-3 bg-black/30 hover:bg-black/50 rounded-lg transition-colors text-left"
                            >
                                <div>
                                    <div className="text-white font-medium">{profile.username}</div>
                                    <div className="text-gray-400 text-sm">
                                        {profile?.stats?.wins || 0}W / {(profile?.stats?.totalGames || 0) - (profile?.stats?.wins || 0)}L
                                    </div>
                                </div>
                                <User className="w-4 h-4 text-purple-400" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setMode('load');
                        setError('');
                        setPassword('');
                    }}
                    className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                        mode === 'load' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'bg-black/20 text-gray-400 hover:text-white hover:bg-black/30'
                    }`}
                >
                    Load Existing
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode('create');
                        setError('');
                        setPassword('');
                    }}
                    className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                        mode === 'create' 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-black/20 text-gray-400 hover:text-white hover:bg-black/30'
                    }`}
                >
                    Create New
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={mode === 'create' ? "Enter new username" : "Username"}
                        className={`w-full bg-black/50 border rounded px-4 py-3 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none ${
                            usernameStatus === 'available' ? 'border-green-500/50 focus:border-green-500' :
                            usernameStatus === 'taken' ? 'border-red-500/50 focus:border-red-500' :
                            'border-purple-500/30 focus:border-purple-500/50'
                        }`}
                        disabled={isLoading || isCreating}
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    {mode === 'create' && identifier.trim().length >= 3 && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            {getUsernameStatusIcon()}
                        </div>
                    )}
                </div>
                
                <div className="relative">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'create' ? "Create password" : "Enter password"}
                        className="w-full bg-black/50 border border-purple-500/30 rounded px-4 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                        disabled={isLoading || isCreating}
                        required={mode === 'create'}
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                </div>
                
                {mode === 'create' && usernameStatus && (
                    <div className={`text-sm flex items-center gap-2 ${
                        usernameStatus === 'available' ? 'text-green-400' :
                        usernameStatus === 'taken' ? 'text-red-400' :
                        'text-gray-400'
                    }`}>
                        {getUsernameStatusIcon()}
                        {getUsernameStatusText()}
                    </div>
                )}
                
                {suggestions.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-2">Try these instead:</div>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setIdentifier(suggestion)}
                                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded text-sm hover:bg-purple-500/30 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {mode === 'create' && (
                    <div className="text-sm text-gray-400">
                        <p>Username requirements:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>3-16 characters long</li>
                            <li>Letters, numbers, hyphens, and underscores only</li>
                        </ul>
                    </div>
                )}
                
                {error && (
                    <div className="text-red-400 text-sm">{error}</div>
                )}
                
                <button
                    type="submit"
                    disabled={!identifier.trim() || !password.trim() || isLoading || isCreating}
                    className={`w-full px-4 py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        mode === 'create'
                            ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    }`}
                >
                    {(isLoading || isCreating) ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {mode === 'create' ? 'Creating...' : 'Loading...'}
                        </>
                    ) : (
                        <>
                            {mode === 'create' ? (
                                <>
                                    <UserPlus size={18} />
                                    Create Profile
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    Load Profile
                                </>
                            )}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default ProfileSelector;