import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, X, Users, Check, AlertCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { friendsApi } from '../services/friendsApi';

const AddFriendModal = ({ isOpen, onClose }) => {
  const { profile } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setMessage({ type: 'error', text: 'Search query must be at least 2 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const users = await friendsApi.searchUsers(searchQuery.trim());
      const filteredUsers = users.filter(user => user.id !== profile?.id);
      setSearchResults(filteredUsers);
      
      if (filteredUsers.length === 0) {
        setMessage({ type: 'info', text: 'No users found with that username' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to search users' });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUser) => {
    if (!profile?.id) {
      setMessage({ type: 'error', text: 'You must be logged in to send friend requests' });
      return;
    }

    try {
      await friendsApi.sendFriendRequest({
        fromUserId: profile.id,
        toUserId: targetUser.id
      });
      setMessage({ type: 'success', text: `Friend request sent to ${targetUser.username}!` });
      setSearchResults(prev => prev.filter(user => user.id !== targetUser.id));
      
      window.dispatchEvent(new CustomEvent('friendRequestSent', {
        detail: { 
          toUsername: targetUser.username,
          toUserId: targetUser.id,
          status: 'pending'
        }
      }));
    } catch (error) {
      console.error('Friend request error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send friend request' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchUsers();
    }
  };

  const resetModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setMessage({ type: '', text: '' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900/95 to-purple-900/95 border border-purple-500/50 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Friend</h2>
                <p className="text-gray-300 text-sm">Search for users to add as friends</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Enter username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  disabled={loading}
                />
              </div>
              <button
                onClick={searchUsers}
                disabled={loading || !searchQuery.trim()}
                className="px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>
          </div>

          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                message.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {message.type === 'success' && <Check size={16} />}
              {message.type === 'error' && <AlertCircle size={16} />}
              {message.type === 'info' && <Users size={16} />}
              <span className="text-sm">{message.text}</span>
            </motion.div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-medium mb-3">Search Results</h3>
              {searchResults.map(user => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.displayName || 'ASTRA Player'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user)}
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded text-sm transition-colors flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    Add
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !loading && !message.text && (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-2">Search for friends by username</p>
              <p className="text-xs text-gray-500">
                Enter at least 2 characters to start searching
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddFriendModal;
