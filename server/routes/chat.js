const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth-supabase');

// Get chat messages
router.get('/messages', auth, async (req, res) => {
  console.log('💬 Fetching chat messages');
  try {
    const { limit = 50, before, recipient_id } = req.query;
    const userId = req.user.id;
    
    let query = supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        created_at,
        recipient_id,
        user:users!user_id (
          id,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    // Filter messages based on recipient
    if (recipient_id && recipient_id !== 'null') {
      // Direct messages: show messages between current user and selected user
      query = query.or(`and(user_id.eq.${userId},recipient_id.eq.${recipient_id}),and(user_id.eq.${recipient_id},recipient_id.eq.${userId})`);
    } else {
      // Group chat: show messages with no recipient (group messages)
      query = query.is('recipient_id', null);
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
    
    // Reverse to show oldest first
    const reversedMessages = messages.reverse();
    
    res.json({
      success: true,
      messages: reversedMessages.map(msg => ({
        id: msg.id,
        message: msg.message,
        createdAt: msg.created_at,
        user: msg.user ? {
          id: msg.user.id,
          firstName: msg.user.first_name,
          lastName: msg.user.last_name,
          email: msg.user.email,
          role: msg.user.role
        } : null
      }))
    });
  } catch (error) {
    console.error('❌ Chat messages error:', error);
    res.status(500).json({ message: 'Failed to fetch chat messages' });
  }
});

// Send chat message
router.post('/messages', auth, async (req, res) => {
  console.log('💬 Sending chat message');
  try {
    const { message, recipient_id } = req.body;
    const userId = req.user.id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        message: message.trim(),
        recipient_id: recipient_id || null // null for group chat, user ID for DM
      })
      .select(`
        id,
        message,
        created_at,
        recipient_id,
        user:users!user_id (
          id,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting message:', insertError);
      return res.status(500).json({ message: 'Failed to send message' });
    }
    
    // Update user presence
    await supabase.rpc('update_user_presence', { p_user_id: userId }).catch(err => {
      console.warn('⚠️ Failed to update presence:', err);
    });
    
    res.json({
      success: true,
      message: {
        id: newMessage.id,
        message: newMessage.message,
        createdAt: newMessage.created_at,
        user: newMessage.user ? {
          id: newMessage.user.id,
          firstName: newMessage.user.first_name,
          lastName: newMessage.user.last_name,
          email: newMessage.user.email,
          role: newMessage.user.role
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get active users
router.get('/active-users', auth, async (req, res) => {
  console.log('👥 Fetching active users');
  try {
    const { data: activeUsers, error } = await supabase
      .rpc('get_active_users');
    
    if (error) {
      console.error('❌ Error fetching active users:', error);
      return res.status(500).json({ message: 'Failed to fetch active users' });
    }
    
    res.json({
      success: true,
      users: activeUsers.map(user => ({
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        lastSeen: user.last_seen,
        isOnline: user.is_online
      }))
    });
  } catch (error) {
    console.error('❌ Active users error:', error);
    res.status(500).json({ message: 'Failed to fetch active users' });
  }
});

// Update user presence (heartbeat)
router.post('/presence', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await supabase.rpc('update_user_presence', { p_user_id: userId });
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Presence update error:', error);
    res.status(500).json({ message: 'Failed to update presence' });
  }
});

// Delete chat message (soft delete)
router.delete('/messages/:id', auth, async (req, res) => {
  console.log('🗑️ Deleting chat message:', req.params.id);
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    
    // Check if user owns the message
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('user_id')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.user_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    // Soft delete
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);
    
    if (deleteError) {
      console.error('❌ Error deleting message:', deleteError);
      return res.status(500).json({ message: 'Failed to delete message' });
    }
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

module.exports = router;

