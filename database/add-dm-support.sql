-- Add Direct Messaging Support to Chat
-- This adds the ability to send private messages between users

-- Add recipient_id column to chat_messages (NULL = group chat, UUID = direct message)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add index for faster DM queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);

-- Add composite index for DM conversations
CREATE INDEX IF NOT EXISTS idx_chat_messages_dm_conversation 
ON chat_messages(user_id, recipient_id, created_at DESC) 
WHERE recipient_id IS NOT NULL;

COMMENT ON COLUMN chat_messages.recipient_id IS 'NULL for group messages, user ID for direct messages';

