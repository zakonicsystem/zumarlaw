import express from 'express';
import { sendMessage, getConversations, getMessages, getMessagesByUser, getUnreadCount, getChatUsers, deleteMessage, searchMessages, getAllMessages, debugAdminState } from '../controllers/chatController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Logging middleware for all chat requests
router.use((req, res, next) => {
  console.log(`[CHAT ROUTE] ${req.method} ${req.path}`);
  next();
});

// All chat routes require authentication
router.use(verifyJWT);

// Send a message
router.post('/send', sendMessage);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get all users who have chatted with current user (for admin view)
router.get('/users', getChatUsers);

// Get messages with a specific user (auto-generates conversation ID)
router.get('/messages/user/:userId', getMessagesByUser);

// Get messages in a specific conversation
router.get('/messages/:conversationId', getMessages);

// DEBUG: Get all messages
router.get('/debug/all-messages', getAllMessages);

// DEBUG: Check and fix admin state
router.get('/debug/admin-state', debugAdminState);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Search messages
router.get('/search', searchMessages);

// Delete a message
router.delete('/message/:messageId', deleteMessage);

export default router;
