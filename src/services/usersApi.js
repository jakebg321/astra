import { requestJson } from './apiClient';

export const usersApi = {
  async getRecentPlayers(userId) {
    if (!userId) return [];
    const data = await requestJson(`/api/users/${userId}/recent-players`);
    return data?.players || [];
  },

  async searchUsers(query) {
    const q = (query || '').trim();
    if (q.length < 2) return [];
    return requestJson(`/api/users/search?q=${encodeURIComponent(q)}`);
  }
};
