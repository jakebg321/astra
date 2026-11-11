import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Users } from 'lucide-react';

const FriendRequestNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const getNotificationMeta = (type) => {
    if (type === 'sent') {
      return {
        title: 'REQUEST SENT',
        accent: 'text-green-300',
        badge: 'bg-green-500/20 border-green-500/50'
      };
    }

    if (type === 'accepted') {
      return {
        title: 'REQUEST ACCEPTED',
        accent: 'text-cyan-300',
        badge: 'bg-cyan-500/20 border-cyan-500/50'
      };
    }

    return {
      title: 'INCOMING REQUEST',
      accent: 'text-orange-300',
      badge: 'bg-orange-500/20 border-orange-500/50'
    };
  };

  useEffect(() => {
    const handleFriendRequestSent = (event) => {
      const { toUsername, status } = event.detail;
      
      const notification = {
        id: Date.now(),
        type: 'sent',
        message: `Friend request sent to ${toUsername}!`,
        status,
        timestamp: new Date()
      };
      
      setNotifications(prev => [...prev, notification]);

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    const handleFriendRequestReceived = (event) => {
      const { fromUsername, requestId } = event.detail;
      
      const notification = {
        id: requestId || Date.now(),
        type: 'received',
        message: `${fromUsername} sent you a friend request!`,
        fromUsername,
        timestamp: new Date()
      };
      
      setNotifications(prev => [...prev, notification]);
    };

    const handleFriendRequestAccepted = (event) => {
      const { username } = event.detail;
      
      const notification = {
        id: Date.now(),
        type: 'accepted',
        message: `${username} accepted your friend request!`,
        timestamp: new Date()
      };
      
      setNotifications(prev => [...prev, notification]);

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    window.addEventListener('friendRequestSent', handleFriendRequestSent);
    window.addEventListener('friendRequestReceived', handleFriendRequestReceived);
    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted);

    return () => {
      window.removeEventListener('friendRequestSent', handleFriendRequestSent);
      window.removeEventListener('friendRequestReceived', handleFriendRequestReceived);
      window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted);
    };
  }, []);

  const handleAccept = async (notification) => {

    console.log('Accepting friend request from:', notification.fromUsername);
    
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    window.dispatchEvent(new CustomEvent('friendRequestAccepted', {
      detail: { username: notification.fromUsername }
    }));
  };

  const handleReject = (notification) => {
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm w-[92vw] sm:w-full">
      <AnimatePresence>
        {notifications.map(notification => {
          const meta = getNotificationMeta(notification.type);
          return (
            <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="hud-panel p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 border
                p-2 rounded-full
                ${notification.type === 'sent' ? 'bg-green-500/30' : ''}
                ${notification.type === 'received' ? 'bg-orange-500/30' : ''}
                ${notification.type === 'accepted' ? 'bg-cyan-500/30' : ''}
                ${meta.badge}
              `}>
                {notification.type === 'sent' && <Check className="w-5 h-5 text-green-300" />}
                {notification.type === 'received' && <UserPlus className="w-5 h-5 text-orange-300" />}
                {notification.type === 'accepted' && <Users className="w-5 h-5 text-cyan-300" />}
              </div>
              
              <div className="flex-1">
                <p className={`text-xs font-mono tracking-wide mb-1 ${meta.accent}`}>
                  [{meta.title}]
                </p>
                <p className="text-white font-medium text-sm leading-5">
                  {notification.message}
                </p>
                
                {notification.type === 'received' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(notification)}
                      className="px-3 py-1 bg-green-500/20 border border-green-500/40 hover:bg-green-500/35 text-green-200 rounded text-xs font-mono transition-colors"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => handleReject(notification)}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/40 hover:bg-red-500/35 text-red-200 rounded text-xs font-mono transition-colors"
                    >
                      REJECT
                    </button>
                  </div>
                )}
              </div>
              
              {notification.type !== 'received' && (
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-white transition-colors mt-0.5"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FriendRequestNotification;
