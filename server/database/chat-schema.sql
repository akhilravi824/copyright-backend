-- Chat System Schema
-- This creates the necessary tables for the real-time chat feature

-- Add recipient_id column to chat_messages if it doesn't exist
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create chat_messages table (if not exists)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);

-- Create user_presence table to track active users
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'online'
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
DROP POLICY IF EXISTS "All users can read chat messages" ON chat_messages;
CREATE POLICY "All users can read chat messages" 
  ON chat_messages FOR SELECT 
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
CREATE POLICY "Users can insert their own messages" 
  ON chat_messages FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
CREATE POLICY "Users can update their own messages" 
  ON chat_messages FOR UPDATE 
  USING (true);

-- Create policies for user_presence
DROP POLICY IF EXISTS "All users can read presence" ON user_presence;
CREATE POLICY "All users can read presence" 
  ON user_presence FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence" 
  ON user_presence FOR ALL 
  USING (true);

-- Create function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, last_seen, is_online, status)
  VALUES (p_user_id, NOW(), TRUE, 'online')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_seen = NOW(),
    is_online = TRUE,
    status = 'online';
END;
$$ LANGUAGE plpgsql;

-- Create function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_presence 
  SET is_online = FALSE, status = 'offline', last_seen = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active users (online in last 5 minutes)
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  role VARCHAR,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    COALESCE(up.last_seen, u.created_at) as last_seen,
    COALESCE(up.is_online, FALSE) as is_online
  FROM users u
  LEFT JOIN user_presence up ON u.id = up.user_id
  WHERE 
    u.is_active = TRUE
    AND (
      up.last_seen > NOW() - INTERVAL '5 minutes'
      OR up.is_online = TRUE
    )
  ORDER BY up.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE chat_messages IS 'Stores all chat messages between users';
COMMENT ON TABLE user_presence IS 'Tracks user presence and online status';
COMMENT ON COLUMN chat_messages.recipient_id IS 'NULL for group chat, user ID for direct messages';

