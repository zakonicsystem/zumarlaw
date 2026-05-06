import express from 'express';
import {
  submitChatMessage,
  sendAdminMessage,
  getConversations,
  getConversationById,
  getUserConversations,
  assignConversation,
  closeConversation,
  deleteConversation,
  deleteMessage
} from '../controllers/contactController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// ===== PUBLIC ENDPOINTS (No Authentication Required) =====

// User sends message through chat button
router.post('/chat', submitChatMessage);

// Get user's conversation by email (public endpoint)
router.get('/user', getUserConversations);

// ===== ADMIN ENDPOINTS (Authentication Required) =====

// Send message to user (admin only)
router.post('/message', verifyJWT, sendAdminMessage);

// Get all conversations (admin)
router.get('/conversations', verifyJWT, getConversations);

// Get single conversation by ID
router.get('/conversations/:conversationId', verifyJWT, getConversationById);

// Assign conversation to admin
router.patch('/conversations/:conversationId/assign', verifyJWT, assignConversation);

// Close conversation
router.patch('/conversations/:conversationId/close', verifyJWT, closeConversation);

// Delete conversation
router.delete('/conversations/:conversationId', verifyJWT, deleteConversation);

// Delete message from conversation
router.delete('/conversations/:conversationId/messages/:messageId', verifyJWT, deleteMessage);

export default router;
