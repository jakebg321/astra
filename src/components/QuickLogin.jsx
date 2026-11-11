import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, LogIn, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const QuickLogin = () => {
  const { login, profile } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <User className="text-green-400" size={20} />
          <div>
            <div className="text-green-300 font-bold">Logged in as {profile.username}</div>
            <div className="text-green-400 text-sm">ID: {profile.id} • Games: {profile.stats?.totalGames || 0}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      console.log('Login successful!');
    } catch (err) {
      setError(err.message);
      console.error('Login failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <LogIn className="text-blue-400" size={20} />
        <h3 className="text-blue-300 font-bold">Quick Login</h3>
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-gray-400" />
            <label className="text-gray-300 text-sm">Username:</label>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter your username"
            required
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={16} className="text-gray-400" />
            <label className="text-gray-300 text-sm">Password:</label>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/20 border border-red-500/50 rounded p-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Login
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default QuickLogin;