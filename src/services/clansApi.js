import { requestJson } from './apiClient';

export const clansApi = {
  async getPublicClans() {
    return requestJson('/api/clans');
  },

  async getUserClan(userId) {
    if (!userId) return null;
    return requestJson(`/api/clans/user/${userId}`);
  },

  async createClan(payload) {
    return requestJson('/api/clans', {
      method: 'POST',
      body: payload
    });
  },

  async joinClan(clanId, userId) {
    return requestJson(`/api/clans/${clanId}/join`, {
      method: 'POST',
      body: { userId }
    });
  },

  async leaveClan(clanId, userId) {
    return requestJson(`/api/clans/${clanId}/leave`, {
      method: 'POST',
      body: { userId }
    });
  },

  async getClanChat(clanId, limit = 50) {
    return requestJson(`/api/clans/${clanId}/chat?limit=${limit}`);
  },

  async sendClanChatMessage(clanId, { userId, message, messageType = 'text' }) {
    return requestJson(`/api/clans/${clanId}/chat`, {
      method: 'POST',
      body: { userId, message, messageType }
    });
  },

  async getClanWars(clanId) {
    return requestJson(`/api/clans/${clanId}/wars`);
  },

  async updateClanBanner(clanId, { userId, bannerData }) {
    return requestJson(`/api/clans/${clanId}/banner`, {
      method: 'PUT',
      body: { userId, bannerData }
    });
  }
};
