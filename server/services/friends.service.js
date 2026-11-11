import postgresDb from '../postgresDatabase.js';

class FriendsService {
    async getFriends(userId) {
        return await postgresDb.getUserFriends(userId);
    }

    async getFriendRequests(userId) {
        const received = await postgresDb.getReceivedFriendRequests(userId);
        const sent = await postgresDb.getSentFriendRequests(userId);
        return { received, sent };
    }

    async sendFriendRequest(fromUserId, toUserId) {

        const areFriends = await postgresDb.checkFriendship(fromUserId, toUserId);
        if (areFriends) {
            throw new Error('Already friends with this user');
        }

        const existingRequest = await postgresDb.checkFriendRequest(fromUserId, toUserId);
        if (existingRequest) {
            console.log(`Found existing ${existingRequest.status} request - deleting to allow resend`);
            await postgresDb.deleteFriendRequest(existingRequest.id);
        }

        return await postgresDb.createFriendRequest(fromUserId, toUserId);
    }

    async acceptFriendRequest(requestId) {
        const request = await postgresDb.getFriendRequest(requestId);
        if (!request) {
            throw new Error('Friend request not found');
        }

        await postgresDb.createFriendship(request.from_user_id, request.to_user_id);

        await postgresDb.deleteFriendRequest(requestId);

        return { success: true };
    }

    async rejectFriendRequest(requestId) {
        await postgresDb.deleteFriendRequest(requestId);
    }

    async removeFriend(userId, friendId) {
        await postgresDb.removeFriendship(userId, friendId);
    }

    async searchUsers(query) {
        return await postgresDb.searchUsers(query);
    }
}

export default new FriendsService();