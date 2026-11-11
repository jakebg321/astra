import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  User,
  LogOut,
  Shield,
  Target,
  Gamepad,
  Menu,
  X
} from 'lucide-react';
import ProfileClanDropdown from './ProfileClanDropdown';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'HQ' },
  { path: '/game', icon: Gamepad, label: 'COMBAT' },
  { path: '/clans', icon: Shield, label: 'CLANS' },
  { path: '/friends', icon: User, label: 'PILOTS' }
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, clearProfile } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (clearProfile) clearProfile();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-gray-900/90 to-black/90 backdrop-blur-md border-b border-cyan-500/30">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-line"></div>

        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center z-40 gap-2 sm:gap-3"
            >
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-cyan-500/50 tactical-border">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              </div>
              <span
                onClick={() => navigate('/')}
                className="text-xl sm:text-2xl font-bold tactical-title cursor-pointer hover:text-shadow-glow transition-all hidden sm:block"
                data-text="ASTRA"
              >
                ASTRA
              </span>
              <div className="text-xs text-cyan-400 font-mono hidden md:block">
                [COMBAT.SYS]
              </div>
            </motion.div>

            <div className="hidden lg:flex items-center space-x-4">
              {profile && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 px-4 py-2 hud-panel"
                >
                  {profile && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-cyan-300">
                        <Shield size={16} className="status-online" />
                        {profile.clan_tag && (
                          <span className="text-yellow-400 font-bold">[{profile.clan_tag}]</span>
                        )}
                        <span className="font-mono font-bold text-sm">{profile.username}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        [ACTIVE]
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-3 py-1 tactical-btn danger text-xs"
                    title="Disconnect"
                  >
                    <LogOut size={14} />
                    <span>DISC</span>
                  </button>
                </motion.div>
              )}

              {profile && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center space-x-1"
                >
                  {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
                    <button
                      key={path}
                      onClick={() => handleNav(path)}
                      className={`group relative px-2 py-1.5 transition-all text-xs font-bold tracking-wider ${isActive(path)
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-cyan-300'
                        }`}
                      style={{
                        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                      }}
                      title={label}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <Icon size={14} />
                        <span>{label}</span>
                      </div>
                      {isActive(path) && (
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3 h-[2px] bg-cyan-400"></div>
                      )}
                    </button>
                  ))}
                  <ProfileClanDropdown variant="navbar" />
                </motion.div>
              )}
            </div>

            {profile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && profile && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-14 left-0 right-0 z-20 bg-black/95 border-b border-cyan-500/30 lg:hidden"
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-cyan-400" />
                  <span className="text-cyan-300 font-mono font-bold">{profile.username}</span>
                  {profile.clan_tag && (
                    <span className="text-yellow-400 font-bold">[{profile.clan_tag}]</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 border border-red-500/30"
                >
                  <LogOut size={12} />
                  DISC
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-4">
              {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`flex flex-col items-center gap-2 p-4 transition-all ${isActive(path)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                    }`}
                >
                  <Icon size={24} />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
