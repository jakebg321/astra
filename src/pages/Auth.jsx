import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import BackgroundVideo from '../components/BackgroundVideo';

const Auth = () => {
  const { profile, isLoading, authenticateUser, error: userError } = useUser();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  if (profile?.username && !profile.username.startsWith('pilot_')) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    try {
      await authenticateUser(loginUsername, loginPassword);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const error = loginError || userError;

  return (
    <div className="relative w-full min-h-screen">
      <BackgroundVideo
        speed={0.25}
        brightness={0.35}
        contrast={1.3}
        overlay={0.65}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="text-7xl font-bold text-purple-300 drop-shadow-2xl">
              ASTRA
            </h1>
            <p className="mt-4 text-xl text-purple-200">
              Two-player browser space combat
            </p>
          </motion.div>

          <div className="w-full max-w-md">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg
                               text-white placeholder-white/40 focus:border-purple-400 focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg
                               text-white placeholder-white/40 focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !loginUsername || !loginPassword}
                    className="w-full py-3 px-6 bg-cyan-600/80 hover:bg-cyan-500/80 disabled:bg-cyan-800/40
                               border border-cyan-400/30 rounded-xl text-white font-semibold
                               transition-all duration-200"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl"
          >
            {[
              {
                title: 'Two Players',
                description: 'Duel a friend in real-time space combat'
              },
              {
                title: 'Instant Setup',
                description: 'Quick and easy profile creation'
              },
              {
                title: 'Start Playing',
                description: 'Jump into matches right away'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-black/20 backdrop-blur-sm rounded-xl p-6 text-center"
              >
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-purple-200">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
