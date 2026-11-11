
export const ValidationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    messages: {
      required: 'Username is required',
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username must be 20 characters or less',
      pattern: 'Username can only contain letters, numbers, hyphens, and underscores'
    }
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-zA-Z])(?=.*[0-9])/,
    messages: {
      required: 'Password is required',
      minLength: 'Password must be at least 8 characters',
      pattern: 'Password must contain at least one letter and one number'
    }
  },
  email: {
    required: true,
    pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
  },
  status: {
    required: true,
    enum: ['online', 'offline', 'away', 'busy']
  }
};

export const UserProfile = {
  id: '',
  username: '',
  email: '',
  status: 'offline',
  lastSeen: null,
  friends: [],
  gameStats: {
    wins: 0,
    losses: 0,
    draws: 0,
    rating: 1000
  },
  preferences: {
    theme: 'dark',
    notifications: true,
    sound: true
  }
};

export const FriendRequest = {
  id: '',
  senderId: '',
  receiverId: '',
  status: 'pending',
  timestamp: null
};

export const GameInvite = {
  id: '',
  senderId: '',
  receiverId: '',
  gameType: 'quickmatch',
  status: 'pending',
  timestamp: null
};

export const FriendStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

export const GameType = {
  QUICKMATCH: 'quickmatch',
  CUSTOM: 'custom',
  TOURNAMENT: 'tournament'
};

export const NotificationType = {
  FRIEND_REQUEST: 'friend_request',
  GAME_INVITE: 'game_invite',
  GAME_RESULT: 'game_result',
  ACHIEVEMENT: 'achievement'
}; 