import ContactSubmission from '../models/ContactSubmission.js';

// ===== CHAT SUPPORT HANDLERS =====

/**
 * User sends message through chat button
 */
const submitChatMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const emailLower = email.toLowerCase();

    // Find or create conversation
    let conversation = await ContactSubmission.findOne({ userEmail: emailLower });

    if (!conversation) {
      // Create new conversation from chat button
      conversation = new ContactSubmission({
        userEmail: emailLower,
        userName: name,
        userPhone: phone || '',
        fromContactForm: false, // Chat button conversations
        messages: [{
          sender: 'user',
          senderName: name,
          senderEmail: emailLower,
          senderPhone: phone || '',
          subject: subject || 'New Conversation',
          message: message.trim(),
          isRead: false
        }],
        lastMessage: message.trim(),
        lastMessageAt: new Date(),
        lastMessageSender: 'user',
        messageCount: 1,
        unreadCount: 1,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } else {
      // Add message to existing conversation
      conversation.messages.push({
        sender: 'user',
        senderName: name,
        senderEmail: emailLower,
        senderPhone: phone || '',
        message: message.trim(),
        isRead: false
      });
      conversation.lastMessage = message.trim();
      conversation.lastMessageAt = new Date();
      conversation.lastMessageSender = 'user';
      conversation.messageCount += 1;
      conversation.unreadCount += 1;
      conversation.status = 'active'; // Reactivate if was closed
    }

    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending message'
    });
  }
};

/**
 * Admin sends message to user
 */
const sendAdminMessage = async (req, res) => {
  try {
    const { userEmail, message, senderName } = req.body;
    const adminId = req.user._id;

    if (!userEmail || !message || !senderName) {
      return res.status(400).json({
        success: false,
        message: 'User email, message, and sender name are required'
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const emailLower = userEmail.toLowerCase();

    // Find or create conversation
    let conversation = await ContactSubmission.findOne({ userEmail: emailLower });

    if (!conversation) {
      // Create new conversation started by admin
      conversation = new ContactSubmission({
        userEmail: emailLower,
        assignedTo: adminId,
        messages: [{
          sender: 'admin',
          senderName: senderName,
          senderEmail: req.user.email,
          senderId: adminId,
          message: message.trim(),
          isRead: false
        }],
        lastMessage: message.trim(),
        lastMessageAt: new Date(),
        lastMessageSender: 'admin',
        messageCount: 1,
        status: 'active',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } else {
      // Add message to existing conversation
      conversation.messages.push({
        sender: 'admin',
        senderName: senderName,
        senderEmail: req.user.email,
        senderId: adminId,
        message: message.trim(),
        isRead: false
      });
      conversation.lastMessage = message.trim();
      conversation.lastMessageAt = new Date();
      conversation.lastMessageSender = 'admin';
      conversation.messageCount += 1;
      conversation.assignedTo = adminId;
      conversation.status = 'active';
    }

    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all conversations for admin
 */
const getConversations = async (req, res) => {
  try {
    const { status = 'active', search = '', page = 1, limit = 20, assignedTo } = req.query;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } }
      ];
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const skip = (page - 1) * limit;

    const conversations = await ContactSubmission.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactSubmission.countDocuments(query);

    res.json({
      success: true,
      data: conversations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get single conversation with all messages
 */
const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await ContactSubmission.findById(conversationId)
      .populate('assignedTo', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark all unread messages as read only if messages array exists
    if (conversation.messages && conversation.messages.length > 0) {
      try {
        await ContactSubmission.updateOne(
          { _id: conversationId },
          {
            $set: {
              'messages.$[].isRead': true,
              unreadCount: 0
            }
          }
        );
      } catch (updateError) {
        // If update fails, just set unreadCount to 0
        await ContactSubmission.updateOne(
          { _id: conversationId },
          { $set: { unreadCount: 0 } }
        );
      }
    }

    // Fetch updated conversation
    const updatedConversation = await ContactSubmission.findById(conversationId)
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      data: updatedConversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's conversations and messages
 */
const getUserConversations = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const conversation = await ContactSubmission.findOne({ userEmail: emailLower })
      .populate('assignedTo', 'name email');

    if (!conversation) {
      return res.json({
        success: true,
        data: null,
        message: 'No conversation found'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('[Form Controller] getUserConversations error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Assign conversation to admin
 */
const assignConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    const conversation = await ContactSubmission.findByIdAndUpdate(
      conversationId,
      { assignedTo: adminId },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation assigned successfully',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Close conversation
 */
const closeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await ContactSubmission.findByIdAndUpdate(
      conversationId,
      { status: 'closed' },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation closed',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete conversation
 */
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await ContactSubmission.findByIdAndDelete(conversationId);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete single message from conversation
 */
const deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const conversation = await ContactSubmission.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.messages = conversation.messages.filter(
      msg => msg._id.toString() !== messageId
    );
    conversation.messageCount = conversation.messages.length;

    if (conversation.messages.length > 0) {
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      conversation.lastMessage = lastMsg.message;
      conversation.lastMessageAt = lastMsg.createdAt;
      conversation.lastMessageSender = lastMsg.sender;
    }

    await conversation.save();

    res.json({
      success: true,
      message: 'Message deleted',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export {
  submitChatMessage,
  sendAdminMessage,
  getConversations,
  getConversationById,
  getUserConversations,
  assignConversation,
  closeConversation,
  deleteConversation,
  deleteMessage
};
