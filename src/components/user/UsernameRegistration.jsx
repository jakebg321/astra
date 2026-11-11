import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Check, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { ValidationRules as ProfileValidation } from '../../types/friend.types.js';

const UsernameRegistration = ({ onClose }) => {
    const { profile, setProfileFromAuth, isLoading: isProfileLoading } = useUser();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const validateUsername = (value) => {
        if (!value) return ProfileValidation.username.messages.required;
        if (value.length < ProfileValidation.username.minLength) 
            return ProfileValidation.username.messages.minLength;
        if (value.length > ProfileValidation.username.maxLength) 
            return ProfileValidation.username.messages.maxLength;
        if (!ProfileValidation.username.pattern.test(value)) 
            return ProfileValidation.username.messages.pattern;
        return null;
    };

    const validatePassword = (value) => {
        if (!value) return ProfileValidation.password.messages.required;
        if (value.length < ProfileValidation.password.minLength) 
            return ProfileValidation.password.messages.minLength;
        if (!ProfileValidation.password.pattern.test(value)) 
            return ProfileValidation.password.messages.pattern;
        return null;
    };

    useEffect(() => {
        if (!username) {
            setIsAvailable(false);
            setError('');
            return;
        }

        const validationError = validateUsername(username);
        if (validationError) {
            setError(validationError);
            setIsAvailable(false);
            return;
        }

        const checkUsername = async () => {
            setIsChecking(true);
            setError('');
            
            try {
                console.log('Checking username:', username);
                const apiUrl = `/api/users/check-username/${encodeURIComponent(username.toLowerCase())}`;
                console.log('API URL:', apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error('Failed to check username');
                }

                const data = await response.json();
                console.log('Response data:', data);

                if (data.error) {
                    setError(data.error);
                    setIsAvailable(false);
                    return;
                }

                setIsAvailable(data.available);
                if (!data.available) {
                    setError(data.message || 'Username already taken');
                }
            } catch (err) {
                console.error('Username check error:', err);
                setError(err.message || 'Error checking username availability');
                setIsAvailable(false);
            } finally {
                setIsChecking(false);
            }
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [username]);

    useEffect(() => {
        if (!password) {
            setPasswordError('');
            return;
        }

        const error = validatePassword(password);
        setPasswordError(error || '');
    }, [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAvailable || isSubmitting) return;

        if (!password) {
            setPasswordError(ProfileValidation.password.messages.required);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to register');
            }
            const result = await response.json();

            if (result.user) {
                setProfileFromAuth(result.user);
            }

            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Failed to register user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value.toLowerCase().trim();
        setUsername(value);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Choose Your Username</h2>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <p className="text-gray-400 mb-6">
                    This will be your permanent username for matchmaking and leaderboards.
                    {' A password is required for registration.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={handleInputChange}
                                placeholder="Enter username (3-16 characters)"
                                autoComplete="username"
                                className={`w-full bg-black/50 border ${
                                    isAvailable ? 'border-green-500/50' :
                                    error ? 'border-red-500/50' :
                                    isChecking ? 'border-yellow-500/50' :
                                    'border-purple-500/30'
                                } rounded px-4 py-2 text-white pr-10 transition-colors duration-200`}
                                disabled={isSubmitting}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isChecking ? (
                                    <Loader2 className="animate-spin text-yellow-500" size={20} />
                                ) : isAvailable ? (
                                    <Check className="text-green-500" size={20} />
                                ) : username && error ? (
                                    <X className="text-red-500" size={20} />
                                ) : null}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Letters, numbers, and underscores only (3-16 characters)
                        </p>
                    </div>

                    {(
                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    autoComplete="new-password"
                                    className={`w-full bg-black/50 border ${
                                        passwordError ? 'border-red-500/50' : 'border-purple-500/30'
                                    } rounded px-4 py-2 text-white pr-10 transition-colors duration-200`}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Minimum 8 characters, at least one letter and one number
                            </p>
                            {passwordError && (
                                <p className="text-xs text-red-400 mt-1">{passwordError}</p>
                            )}
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive" className="bg-red-900/50 border-red-500/30">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <button
                        type="submit"
                        disabled={!isAvailable || isSubmitting || !password}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity duration-200"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} />
                                Creating Profile...
                            </span>
                        ) : (
                            'Continue'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UsernameRegistration;