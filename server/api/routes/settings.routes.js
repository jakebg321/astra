import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import settingsService from '../../services/settings.service.js';

const router = express.Router();

router.get('/settings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await settingsService.getUserSettings(userId);
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user settings'
    });
  }
});

router.put('/settings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings data'
      });
    }

    const updatedSettings = await settingsService.updateUserSettings(userId, settings);
    
    res.json({
      success: true,
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user settings'
    });
  }
});

router.post('/settings/migrate', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { localStorageData } = req.body;

    if (!localStorageData || typeof localStorageData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid localStorage data'
      });
    }

    const migratedSettings = await settingsService.migrateLocalStorageSettings(userId, localStorageData);
    
    res.json({
      success: true,
      message: 'Settings migrated successfully',
      settings: migratedSettings
    });
  } catch (error) {
    console.error('Error migrating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to migrate settings'
    });
  }
});

router.post('/settings/bulk', authenticateUser, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user IDs'
      });
    }

    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Too many user IDs (max 50)'
      });
    }

    const settings = await settingsService.getBulkUserSettings(userIds);
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching bulk settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bulk settings'
    });
  }
});

router.delete('/settings', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    await settingsService.deleteUserSettings(userId);
    
    res.json({
      success: true,
      message: 'Settings deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user settings'
    });
  }
});

export default router;