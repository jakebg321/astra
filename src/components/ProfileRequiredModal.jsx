import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AlertCircle, Rocket, Target, Shield, Zap, Lock, Eye, EyeOff, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const ProfileRequiredModal = ({ isOpen, onProfileCreated, onClose, isOptional = false }) => {
  const { createProfile, authenticateUser, isLoading, error, clearError } = useUser();
  const [mode, setMode] = useState('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const validateUsername = (value) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 16) return 'Username must be 16 characters or less';
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return '';
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    const error = validateUsername(value);
    if (error) {
      setValidationError(error);
    } else {
      setValidationError('');
    }
    clearError();
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const usernameError = validateUsername(username);
    if (usernameError) {
      setValidationError(usernameError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setIsCreating(true);
    try {
      let profile;
      if (mode === 'signup') {
        profile = await createProfile(username, password);
        onProfileCreated(profile);
      } else {
        profile = await authenticateUser(username, password);
        onProfileCreated(profile);
      }
    } catch (err) {
      const msg = err.message || '';
      if (mode === 'signup' && /already taken/i.test(msg)) {

        setMode('login');
        setConfirmPassword('');
        setValidationError('Account exists — enter your password to log in');
        clearError();
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative w-full max-w-md mx-4"
      >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-orange-500/20 blur-xl" />
            
            <div className="relative bg-slate-900/95 border border-cyan-500/30 rounded-lg p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Shield className="w-16 h-16 text-cyan-400" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">
                  {mode === 'signup' ? 'JOIN ASTRA ELITE' : 'WELCOME BACK, PILOT'}
                </h2>
                <p className="text-gray-400">
                  {mode === 'signup' 
                    ? 'Create your profile to access all features'
                    : 'Log in to continue your mission'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  <span>Track your stats</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span>Compete globally</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Unlock rewards</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User className="w-4 h-4 text-green-400" />
                  <span>Join the elite</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    {mode === 'signup' ? 'Choose Your Callsign' : 'Callsign'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="Enter username"
                      className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        validationError || error 
                          ? 'border-red-500' 
                          : 'border-gray-600 focus:border-cyan-500'
                      }`}
                      maxLength={16}
                      required
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {username.length}/16
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                        setValidationError('');
                      }}
                      placeholder="Enter password"
                      className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        validationError || error 
                          ? 'border-red-500' 
                          : 'border-gray-600 focus:border-cyan-500'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearError();
                        setValidationError('');
                      }}
                      placeholder="Confirm password"
                      className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        validationError || error 
                          ? 'border-red-500' 
                          : 'border-gray-600 focus:border-cyan-500'
                      }`}
                      required
                    />
                  </div>
                )}
                  
                {(validationError || error) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationError || error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || isCreating || !username || validationError}
                  className={`w-full py-3 px-4 font-bold rounded-lg transition-all transform hover:scale-105 ${
                    isLoading || isCreating || !username || validationError
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700'
                  }`}
                >
                  {isLoading || isCreating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{mode === 'signup' ? 'Creating Profile...' : 'Logging in...'}</span>
                    </div>
                  ) : (
                    mode === 'signup' ? 'CREATE PROFILE' : 'LOG IN'
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signup' ? 'login' : 'signup');
                      setValidationError('');
                      clearError();
                    }}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {mode === 'signup' 
                      ? 'Already have an account? Log in'
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>

              <div className="mt-6 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-xs text-orange-300 text-center">
                  {isOptional
                    ? '💡 Create a profile to save progress, add friends, and compete!'
                    : '⚠️ Profile required to play. Your stats and progress will be saved.'}
                </p>
              </div>
              {isOptional && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
  );
};

export default ProfileRequiredModal;