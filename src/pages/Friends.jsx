import React from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FriendsPanel from '../components/FriendsPanel';

const Friends = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/40 to-slate-900"></div>
      
      <div className="absolute inset-0 bg-grid-cyan-500/10 opacity-30"></div>
      
      <div className="relative z-10 container mx-auto px-6 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg hover:border-cyan-400/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-400" />
          </motion.button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg border border-cyan-500/30">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">PILOT NETWORK</h1>
              <p className="text-cyan-400/80">Manage friends & send invites</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <FriendsPanel isOpen={true} onClose={() => navigate('/')} />
        </motion.div>
      </div>
    </div>
  );
};

export default Friends;