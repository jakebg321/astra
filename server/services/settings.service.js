import pool from '../postgres.js';

class SettingsService {

  async getUserSettings(userId) {
    try {

      await pool.query(
        'INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );
      const { rows } = await pool.query(
        'SELECT * FROM user_settings WHERE user_id = $1',
        [userId]
      );
      return this.formatSettingsForClient(rows[0]);
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, settings) {
    try {

      const updates = [];
      const values = [];
      const allowedFields = [

        'mouse_sensitivity', 'invert_y', 'no_roll_strafe', 'visual_roll_only',

        'camera_mode', 'camera_distance', 'camera_momentum', 'camera_smoothing',
        'boost_camera_distance', 'boost_camera_smoothing', 'speed_based_camera',
        'camera_distance_min', 'camera_distance_max', 'camera_min_distance', 'camera_max_distance',

        'trails_enabled', 'effects_enabled', 'shadows_enabled', 'quality_level',
        'adaptive_throttling', 'target_fps', 'pixel_ratio', 'optimized_for',

        'cockpit_mode', 'bullet_style',

        'show_cockpit_radar', 'show_enemy_indicators', 'show_fps', 'show_dev_settings', 'show_debug',

        'tutorial_completed'
      ];

      const jsonFields = ['radar_calibrations', 'enemy_indicator_params', 'test_mode_config', 'cockpit_transform'];

      for (const field of allowedFields) {
        if (Object.hasOwn(settings, field)) {
          values.push(settings[field]);
          updates.push(`${field} = $${values.length}`);
        }
      }

      for (const field of jsonFields) {
        if (Object.hasOwn(settings, field)) {
          values.push(JSON.stringify(settings[field]));
          updates.push(`${field} = $${values.length}`);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid settings to update');
      }

      await this.getUserSettings(userId);
      values.push(userId);

      const updateQuery = `
        UPDATE user_settings 
        SET ${updates.join(', ')}
        WHERE user_id = $${values.length}
        RETURNING *
      `;

      const { rows } = await pool.query(updateQuery, values);
      return this.formatSettingsForClient(rows[0]);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  async deleteUserSettings(userId) {
    try {
      await pool.query(
        'DELETE FROM user_settings WHERE user_id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Error deleting user settings:', error);
      throw error;
    }
  }

  formatSettingsForClient(settings) {
    if (!settings) return null;

    const formatted = { ...settings };

    const jsonFields = ['radar_calibrations', 'enemy_indicator_params', 'test_mode_config', 'cockpit_transform'];
    for (const field of jsonFields) {
      if (typeof formatted[field] === 'string') {
        try {
          formatted[field] = JSON.parse(formatted[field]);
        } catch (e) {
          console.error(`Error parsing ${field}:`, e);
          formatted[field] = null;
        }
      }
    }

    delete formatted.created_at;
    delete formatted.updated_at;

    return formatted;
  }

  async getBulkUserSettings(userIds) {
    try {
      if (!userIds || userIds.length === 0) return [];

      const { rows } = await pool.query(
        `SELECT user_id, cockpit_mode, bullet_style, quality_level
         FROM user_settings
         WHERE user_id = ANY($1::int[])`,
        [userIds]
      );

      return rows;
    } catch (error) {
      console.error('Error getting bulk user settings:', error);
      throw error;
    }
  }

  async migrateLocalStorageSettings(userId, localStorageSettings) {
    try {

      const mappings = {

        mouseSensitivity: 'mouse_sensitivity',
        invertY: 'invert_y',
        noRollStrafe: 'no_roll_strafe',
        visualRollOnly: 'visual_roll_only',
        cameraMode: 'camera_mode',
        cameraDistance: 'camera_distance',
        cameraMomentum: 'camera_momentum',
        cameraSmoothing: 'camera_smoothing',
        boostCameraDistance: 'boost_camera_distance',
        boostCameraSmoothing: 'boost_camera_smoothing',
        speedBasedCamera: 'speed_based_camera',
        cameraDistanceMin: 'camera_distance_min',
        cameraDistanceMax: 'camera_distance_max',
        cameraMinDistance: 'camera_min_distance',
        cameraMaxDistance: 'camera_max_distance',
        bulletStyle: 'bullet_style',
        tempCockpitMode: 'cockpit_mode',
        globalCockpitMode: 'cockpit_mode',
        showCockpitRadar: 'show_cockpit_radar',
        enemyIndicator: 'show_enemy_indicators',
        showFPS: 'show_fps',
        showDevSettings: 'show_dev_settings',
        showDebug: 'show_debug',
        targetFPS: 'target_fps'
      };

      const migratedSettings = {};

      for (const [localKey, dbKey] of Object.entries(mappings)) {
        if (Object.hasOwn(localStorageSettings, localKey)) {
          migratedSettings[dbKey] = localStorageSettings[localKey];
        }
      }

      if (localStorageSettings.astra_performance_settings) {
        const perfSettings = localStorageSettings.astra_performance_settings;
        if (perfSettings.trails !== undefined) migratedSettings.trails_enabled = perfSettings.trails;
        if (perfSettings.effects !== undefined) migratedSettings.effects_enabled = perfSettings.effects;
        if (perfSettings.shadows !== undefined) migratedSettings.shadows_enabled = perfSettings.shadows;
        if (perfSettings.quality) migratedSettings.quality_level = perfSettings.quality;
        if (perfSettings.adaptiveThrottling !== undefined) migratedSettings.adaptive_throttling = perfSettings.adaptiveThrottling;
        if (perfSettings.optimizedFor) migratedSettings.optimized_for = perfSettings.optimizedFor;
        if (perfSettings.pixelRatio !== undefined) migratedSettings.pixel_ratio = perfSettings.pixelRatio;
      }

      if (localStorageSettings.radarCalibrations) {
        migratedSettings.radar_calibrations = localStorageSettings.radarCalibrations;
      }
      if (localStorageSettings.enemyIndicatorParams) {
        migratedSettings.enemy_indicator_params = localStorageSettings.enemyIndicatorParams;
      }
      if (localStorageSettings.astra_test_config) {
        migratedSettings.test_mode_config = localStorageSettings.astra_test_config;
      }
      if (localStorageSettings.cockpitTransform) {
        migratedSettings.cockpit_transform = localStorageSettings.cockpitTransform;
      }

      if (localStorageSettings[`astra_tutorial_completed_${userId}`]) {
        migratedSettings.tutorial_completed = true;
      }

      if (Object.keys(migratedSettings).length > 0) {
        await this.updateUserSettings(userId, migratedSettings);
      }

      return migratedSettings;
    } catch (error) {
      console.error('Error migrating localStorage settings:', error);
      throw error;
    }
  }
}

export default new SettingsService();