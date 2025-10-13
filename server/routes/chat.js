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

// Get all users with their online status
router.get('/active-users', auth, async (req, res) => {
  console.log('👥 Fetching all users');
  try {
    const currentUserId = req.user.id;
    
    // Get all users with their presence status
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        created_at
      `)
      .eq('is_active', true)
      .order('first_name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
    
    // Get presence information for all users
    const { data: presenceData } = await supabase
      .from('user_presence')
      .select('user_id, last_seen, is_online, status');
    
    // Create a map of presence data
    const presenceMap = {};
    if (presenceData) {
      presenceData.forEach(p => {
        presenceMap[p.user_id] = p;
      });
    }
    
    // Combine user data with presence data
    const usersWithPresence = users
      .filter(user => user.id !== currentUserId) // Exclude current user
      .map(user => {
        const presence = presenceMap[user.id];
        const lastSeen = presence?.last_seen || user.created_at;
        const isOnline = presence?.is_online && 
                        new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
        
        return {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          lastSeen: lastSeen,
          isOnline: isOnline
        };
      });
    
    res.json({
      success: true,
      users: usersWithPresence
    });
  } catch (error) {
    console.error('❌ Users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
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

