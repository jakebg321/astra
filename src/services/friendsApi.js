import { requestJson } from './apiClient';

export const friendsApi = {
  async getFriends(userId) {
    if (!userId) return [];
    const data = await requestJson(`/api/friends/${userId}`);
    return data?.friends || [];
  },

  async getFriendRequests(userId) {
    if (!userId) {
      return { received: [], sent: [] };
    }
    const data = await requestJson(`/api/friends/${userId}/requests`);
    return {
      received: data?.received || [],
      sent: data?.sent || []
    };
  },

  async searchUsers(query) {
    const q = (query || '').trim();
    if (q.length < 2) return [];
    return requestJson(`/api/friends/search/users?q=${encodeURIComponent(q)}`);
  },

  async sendFriendRequest({ fromUserId, toUserId, toUsername }) {
    return requestJson('/api/friends/request', {
      method: 'POST',
      body: { fromUserId, toUserId, toUsername }
    });
  },

  async respondToFriendRequest(requestId, action) {
    return requestJson(`/api/friends/request/${requestId}`, {
      method: 'PATCH',
      body: { action }
    });
  },

  async acceptFriendRequest(requestId) {
    return requestJson(`/api/friends/request/${requestId}/accept`, {
      method: 'PUT'
    });
  },

  async rejectFriendRequest(requestId) {
    return requestJson(`/api/friends/request/${requestId}/reject`, {
      method: 'PUT'
    });
  },

  async removeFriend(userId, friendId) {
    return requestJson(`/api/friends/${userId}/${friendId}`, {
      method: 'DELETE'
    });
  }
};
