import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Users,
  Shield, 
  Settings, 
  BarChart3, 
  CircleUserRound,
  ChevronDown,
  LogOut,
  Target
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const ProfileClanDropdown = ({ 
  variant = 'default',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { profile, clearProfile } = useUser();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (clearProfile) clearProfile();
    setIsOpen(false);
    navigate('/');
  };

  const navigateAndClose = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleFriendsClick = () => {
    setIsOpen(false);
    navigate('/friends');
  };

  const menuItems = [
    {
      icon: User,
      label: 'MY PROFILE',
      path: '/profile',
      description: 'Pilot data & stats'
    },
    {
      icon: Users,
      label: 'FRIENDS',
      action: handleFriendsClick,
      description: 'Manage pilot network'
    },
    {
      icon: Shield,
      label: 'CLANS',
      path: '/clans',
      description: 'Alliance management'
    },
    {
      icon: CircleUserRound,
      label: 'CUSTOMIZE',
      path: '/customize',
      description: 'Ship & pilot setup'
    },
    {
      icon: BarChart3,
      label: 'STATISTICS',
      path: '/stats',
      description: 'Combat analytics'
    },
    {
      icon: Settings,
      label: 'SETTINGS',
      path: '/settings',
      description: 'System configuration'
    }
  ];

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          trigger: 'tactical-btn px-3 py-2 text-sm',
          menu: 'min-w-48'
        };
      case 'navbar':
        return {
          trigger: 'tactical-btn px-4 py-2',
          menu: 'min-w-56'
        };
      default:
        return {
          trigger: 'tactical-btn px-6 py-4 text-lg',
          menu: 'min-w-64'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.trigger} flex items-center gap-3 relative group`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-cyan-500/50 flex items-center justify-center tactical-border">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold">
              {profile?.username || 'PILOT'}
            </span>
            {variant === 'default' && (
              <span className="text-xs text-gray-400 font-mono">
                [COMMAND CENTER]
              </span>
            )}
          </div>
        </div>

        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`} 
        />


        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full right-0 mt-4 ${styles.menu} hud-panel bg-black/95 border border-cyan-500/30 z-50`}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              minWidth: '280px',
              maxHeight: '400px',
              overflowY: 'auto',
              transform: 'translateY(10px)'
            }}
          >
            <div className="px-4 py-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold tactical-title text-cyan-300">
                  COMMAND MENU
                </span>
              </div>
              {profile && (
                <div className="text-xs text-gray-400 font-mono mt-1">
                  PILOT: {profile.username}
                </div>
              )}
            </div>

            <div className="py-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.path || item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => item.action ? item.action() : navigateAndClose(item.path)}
                  className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 transition-colors group flex items-center gap-3"
                >
                  <item.icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-cyan-300 group-hover:text-cyan-200">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {item.description}
                    </div>
                  </div>
                  
                  <div className="w-2 h-2 border-t border-r border-cyan-400/50 transform rotate-45 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.button>
              ))}
            </div>

            {profile && (
              <>
                <div className="border-t border-cyan-500/20 my-2"></div>
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: menuItems.length * 0.05 }}
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left hover:bg-red-500/10 transition-colors group flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-red-400 group-hover:text-red-300">
                      DISCONNECT
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      Logout & clear session
                    </div>
                  </div>
                </motion.button>
              </>
            )}

            <div className="px-4 py-2 border-t border-cyan-500/20 bg-cyan-500/5">
              <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
                <span>[SYS.STATUS]</span>
                <span className="text-green-400">[ONLINE]</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileClanDropdown;