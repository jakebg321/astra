
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'online',
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    avatar VARCHAR(50) DEFAULT 'pilot1',
    custom_avatar TEXT,
    bio TEXT,
    theme VARCHAR(50) DEFAULT 'cosmic',
    status_message VARCHAR(100),
    personal_banner JSONB,
    privacy_settings JSONB DEFAULT '{"profile_visible": true, "stats_visible": true}'::jsonb
);


CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30),
    condition_type VARCHAR(30),
    condition_value INTEGER,
    points INTEGER DEFAULT 0
);


CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);


CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    winner_id INTEGER REFERENCES users(id),
    match_type VARCHAR(20) DEFAULT 'duel',
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);


CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user_id, to_user_id)
);


CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);


DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='friendships' AND column_name='updated_at') THEN
        ALTER TABLE friendships ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;


INSERT INTO achievements (id, name, description, category, condition_type, condition_value, points)
VALUES 
    ('first_win', 'First Victory', 'Win your first match', 'first_win', 'wins', 1, 10),
    ('veteran', 'Space Veteran', 'Play 10 matches', 'veteran', 'games_played', 10, 25),
    ('win_streak_3', 'Hot Streak', 'Win 3 matches in a row', 'win_streak', 'win_streak', 3, 50),
    ('sharpshooter', 'Sharpshooter', 'Win 5 matches', 'sharpshooter', 'wins', 5, 30),
    ('elite_pilot', 'Elite Pilot', 'Win 25 matches', 'elite', 'wins', 25, 100),
    ('combat_master', 'Combat Master', 'Win 50 matches', 'combat', 'wins', 50, 200)
ON CONFLICT (id) DO NOTHING;




CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    tag VARCHAR(8) UNIQUE NOT NULL,
    description TEXT,
    banner_data JSONB,
    icon_url VARCHAR(255),
    

    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    

    is_public BOOLEAN DEFAULT true,
    min_level_requirement INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 50,
    

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS clan_members (
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contribution_xp INTEGER DEFAULT 0,
    weekly_activity INTEGER DEFAULT 0,
    PRIMARY KEY (clan_id, user_id)
);


CREATE TABLE IF NOT EXISTS clan_invites (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    invited_by INTEGER REFERENCES users(id),
    invited_user INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);


CREATE TABLE IF NOT EXISTS clan_announcements (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),
    title VARCHAR(100),
    content TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS clan_chat (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    message TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS clan_wars (
    id SERIAL PRIMARY KEY,
    challenger_clan INTEGER REFERENCES clans(id),
    defender_clan INTEGER REFERENCES clans(id),
    status VARCHAR(20) DEFAULT 'pending',
    war_type VARCHAR(20) DEFAULT 'standard',
    challenger_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    winner_clan INTEGER REFERENCES clans(id),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS clan_achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    category VARCHAR(30),
    xp_reward INTEGER DEFAULT 100,
    icon VARCHAR(50)
);


CREATE TABLE IF NOT EXISTS clan_earned_achievements (
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES clan_achievements(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (clan_id, achievement_id)
);


CREATE TABLE IF NOT EXISTS clan_activity_log (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='clan_id') THEN
        ALTER TABLE users ADD COLUMN clan_id INTEGER REFERENCES clans(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='clan_role') THEN
        ALTER TABLE users ADD COLUMN clan_role VARCHAR(20);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='clan_joined_at') THEN
        ALTER TABLE users ADD COLUMN clan_joined_at TIMESTAMP;
    END IF;
END $$;


CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_chat_clan ON clan_chat(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_wars_status ON clan_wars(status);
CREATE INDEX IF NOT EXISTS idx_users_clan ON users(clan_id);


INSERT INTO clan_achievements (id, name, description, category, xp_reward, icon) VALUES
    ('first_blood', 'First Blood', 'Win your first clan war', 'war', 500, 'crossed-swords'),
    ('war_machine', 'War Machine', 'Win 10 clan wars', 'war', 1000, 'tank'),
    ('undefeated', 'Undefeated', 'Win 5 clan wars in a row', 'war', 2000, 'shield-check'),
    ('recruitment_drive', 'Recruitment Drive', 'Reach 25 members', 'growth', 750, 'users'),
    ('full_house', 'Full House', 'Reach maximum capacity', 'growth', 1500, 'home'),
    ('active_community', 'Active Community', '100 messages in clan chat', 'social', 500, 'message-circle'),
    ('elite_status', 'Elite Status', 'Reach clan level 10', 'prestige', 3000, 'crown')
ON CONFLICT (id) DO NOTHING;




CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    

    mouse_sensitivity DECIMAL(5,4) DEFAULT 0.002,
    invert_y BOOLEAN DEFAULT false,
    no_roll_strafe BOOLEAN DEFAULT false,
    visual_roll_only BOOLEAN DEFAULT false,
    

    camera_mode VARCHAR(20) DEFAULT 'simple',
    camera_distance DECIMAL(4,1) DEFAULT 12.0,
    camera_momentum BOOLEAN DEFAULT false,
    camera_smoothing DECIMAL(4,2) DEFAULT 0.15,
    boost_camera_distance DECIMAL(4,2) DEFAULT 1.3,
    boost_camera_smoothing DECIMAL(4,2) DEFAULT 0.20,
    speed_based_camera BOOLEAN DEFAULT false,
    camera_distance_min DECIMAL(4,2) DEFAULT 0.8,
    camera_distance_max DECIMAL(4,2) DEFAULT 1.3,
    camera_min_distance DECIMAL(4,1) DEFAULT 15.0,
    camera_max_distance DECIMAL(4,1) DEFAULT 40.0,
    

    trails_enabled BOOLEAN DEFAULT true,
    effects_enabled BOOLEAN DEFAULT true,
    shadows_enabled BOOLEAN DEFAULT true,
    quality_level VARCHAR(10) DEFAULT 'High',
    adaptive_throttling BOOLEAN DEFAULT false,
    target_fps VARCHAR(10) DEFAULT 'unlimited',
    pixel_ratio DECIMAL(3,2) DEFAULT 1.0,
    optimized_for VARCHAR(20) DEFAULT 'Balanced',
    

    cockpit_mode BOOLEAN DEFAULT false,
    bullet_style INTEGER DEFAULT 2 CHECK (bullet_style >= 1 AND bullet_style <= 5),
    

    show_cockpit_radar BOOLEAN DEFAULT true,
    show_enemy_indicators BOOLEAN DEFAULT true,
    show_fps BOOLEAN DEFAULT false,
    show_dev_settings BOOLEAN DEFAULT false,
    show_debug BOOLEAN DEFAULT false,
    

    tutorial_completed BOOLEAN DEFAULT false,
    

    radar_calibrations JSONB,
    enemy_indicator_params JSONB,
    test_mode_config JSONB,
    cockpit_transform JSONB,
    

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);


CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS update_user_settings_timestamp ON user_settings;
CREATE TRIGGER update_user_settings_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_timestamp();
