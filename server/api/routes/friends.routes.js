import express from 'express';
import friendsService from '../../services/friends.service.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const friends = await friendsService.getFriends(userId);
        res.json({ friends });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

router.get('/:userId/requests', async (req, res) => {
    try {
        const { userId } = req.params;
        const requests = await friendsService.getFriendRequests(userId);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ error: 'Failed to fetch friend requests' });
    }
});

router.post('/request', async (req, res) => {
    try {
        const { fromUserId, toUserId, toUsername } = req.body;

        if (!fromUserId) {
            return res.status(400).json({ error: 'From user ID required' });
        }

        let targetUserId = toUserId;

        if (toUsername && !toUserId) {
            const users = await friendsService.searchUsers(toUsername);
            const exactMatch = users.find(user => user.username.toLowerCase() === toUsername.toLowerCase());

            if (!exactMatch) {
                return res.status(404).json({ error: 'User not found' });
            }

            targetUserId = exactMatch.id;
        }

        if (!targetUserId) {
            return res.status(400).json({ error: 'Target user ID or username required' });
        }

        if (fromUserId == targetUserId) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const request = await friendsService.sendFriendRequest(fromUserId, targetUserId);

        const sender = await friendsService.searchUsers(fromUserId);
        if (req.sendToUser) {
            req.sendToUser(targetUserId, 'friend_request', {
                requestId: request.id,
                fromUserId,
                fromUsername: sender[0]?.username || 'Someone',
                timestamp: new Date()
            });
        }

        res.json(request);
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ error: error.message || 'Failed to send friend request' });
    }
});

router.patch('/request/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body;

        if (action === 'accept') {
            const result = await friendsService.acceptFriendRequest(requestId);

            res.json(result);
        } else if (action === 'reject') {
            await friendsService.rejectFriendRequest(requestId);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid action. Must be "accept" or "reject"' });
        }
    } catch (error) {
        console.error('Error handling friend request:', error);
        res.status(500).json({ error: 'Failed to handle friend request' });
    }
});

router.put('/request/:requestId/accept', async (req, res) => {
    try {
        const { requestId } = req.params;
        const result = await friendsService.acceptFriendRequest(requestId);

        res.json(result);
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

router.put('/request/:requestId/reject', async (req, res) => {
    try {
        const { requestId } = req.params;
        await friendsService.rejectFriendRequest(requestId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        res.status(500).json({ error: 'Failed to reject friend request' });
    }
});

router.delete('/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;
        await friendsService.removeFriend(userId, friendId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

router.get('/search/users', async (req, res) => {
    try {
        const { q: query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const users = await friendsService.searchUsers(query.trim());
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

export default router;