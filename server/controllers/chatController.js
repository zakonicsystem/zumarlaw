import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import mongoose from 'mongoose';
import path from 'path';

// Generate unique conversation ID from two user IDs
const generateConversationId = (userId1, userId2) => {
  // Ensure both are valid ObjectIds and convert to strings
  let id1, id2;
  try {
    id1 = (userId1 instanceof mongoose.Types.ObjectId ? userId1 : new mongoose.Types.ObjectId(userId1)).toString();
  } catch (e) {
    id1 = String(userId1);
  }
  try {
    id2 = (userId2 instanceof mongoose.Types.ObjectId ? userId2 : new mongoose.Types.ObjectId(userId2)).toString();
  } catch (e) {
    id2 = String(userId2);
  }

  const ids = [id1, id2].sort();
  const convId = `${ids[0]}-${ids[1]}`;
  console.log(`[generateConversationId] ${id1} + ${id2} => ${convId}`);
  return convId;
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, receiverRole, receiverEmail, message, subject, relatedRefundId } = req.body;
    const user = req.user;

    console.log('[sendMessage] ====== START ======');
    console.log('[sendMessage] Sender:', user?.id, user?.role, user?.email);
    console.log('[sendMessage] Request body:', req.body);

    if (!user || !user.id) {
      console.error('[sendMessage] ❌ No user authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!receiverId || !message) {
      console.error('[sendMessage] ❌ Missing receiverId or message');
      return res.status(400).json({ error: 'Receiver ID and message are required' });
    }

    let finalReceiverId = receiverId;
    let finalReceiverEmail = receiverEmail;

    // If receiver is 'admin' (string), find the actual admin user in database
    if (receiverId === 'admin' || receiverRole === 'admin') {
      console.log('[sendMessage] Looking up admin user...');
      // CRITICAL: Always use first (or only) admin from Admin collection for consistency
      let adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id email firstName lastName');

      if (adminRecord) {
        finalReceiverId = adminRecord._id;
        finalReceiverEmail = adminRecord.email;
        console.log('[sendMessage] ✓ Admin found in Admin collection:', adminRecord._id.toString(), adminRecord.email);
      } else {
        console.error('[sendMessage] ❌ No admin found in Admin collection');
        return res.status(404).json({ error: 'Admin not found' });
      }
    }

    // Resolve sender ID - if the sender is an admin/employee, map to the standard Admin record
    let senderId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      const adminRecordForSender = await Admin.findOne({}).sort({ _id: 1 }).select('_id email firstName lastName');
      if (adminRecordForSender) {
        senderId = adminRecordForSender._id;
        console.log('[sendMessage] Admin sender resolved to:', senderId.toString());
      }
    }
    const receiverIdObj = new mongoose.Types.ObjectId(finalReceiverId);

    const conversationId = generateConversationId(senderId, receiverIdObj);
    console.log('[sendMessage] ✓ Generated conversationId:', conversationId);
    console.log('[sendMessage] Sender ID (string):', senderId.toString());
    console.log('[sendMessage] Receiver ID (string):', receiverIdObj.toString());
    console.log('[sendMessage] Receiver email:', finalReceiverEmail);

    // Determine sender role: if user is from Admin/Employee, mark as 'admin'/'employee' (frontend uses this for alignment)
    // Otherwise it's a regular 'user'
    const senderRole = user.role && user.role !== 'user' ? user.role : 'user';

    const chatMessage = new ChatMessage({
      senderId: senderId,
      senderRole: senderRole,
      senderName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
      senderEmail: user.email,
      receiverId: receiverIdObj,
      receiverRole: receiverRole || 'admin',
      receiverEmail: finalReceiverEmail,
      message: message.trim(),
      subject: subject?.trim(),
      conversationId,
      relatedRefundId
    });

    const saved = await chatMessage.save();
    console.log('[sendMessage] ✓ Message saved:', saved._id);
    console.log('[sendMessage] ====== END ======');
    res.status(201).json(saved);
  } catch (err) {
    console.error('[sendMessage] ❌ Error:', err.message);
    console.error('[sendMessage] Stack:', err.stack);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

// Get all conversations for a user (preview list)
export const getConversations = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      console.error('[getConversations] ❌ No user authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[getConversations] User:', user.id, user.role);

    // CRITICAL: If admin/employee, resolve to standard admin ID
    let queryUserId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      console.log('[getConversations] Admin/Employee detected, resolving admin ID...');
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) {
        queryUserId = adminRecord._id;
        console.log('[getConversations] Admin ID resolved to:', queryUserId.toString());
      }
    }

    // Get latest message from each conversation
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: queryUserId },
            { receiverId: queryUserId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          latestMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', queryUserId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'latestMessage.createdAt': -1 }
      }
    ]);

    console.log('[getConversations] queryUserId:', queryUserId.toString());
    const matchingCount = await ChatMessage.countDocuments({ $or: [ { senderId: queryUserId }, { receiverId: queryUserId } ] });
    console.log('[getConversations] Matching messages count for user:', matchingCount);
    console.log('[getConversations] ✓ Found', conversations.length, 'conversations');
    // Fallback: if no conversations found via aggregate (some DBs may not match), try a direct find
    if (!conversations || conversations.length === 0) {
      console.warn('[getConversations] No aggregated conversations found, running fallback query');
      const fallbackMsgs = await ChatMessage.find({
        $or: [
          { senderId: queryUserId },
          { receiverId: queryUserId }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(100);

      if (fallbackMsgs.length > 0) {
        const grouped = new Map();
        for (const m of fallbackMsgs) {
          if (!grouped.has(m.conversationId)) {
            grouped.set(m.conversationId, { latestMessage: m, messageCount: 1 });
          } else {
            grouped.get(m.conversationId).messageCount++;
          }
        }

        const fallbackConversations = Array.from(grouped, ([conversationId, value]) => ({
          _id: conversationId,
          latestMessage: value.latestMessage,
          messageCount: value.messageCount,
          unreadCount: 0
        }));

        console.log('[getConversations] ✓ Found fallback', fallbackConversations.length, 'conversations');
        // Normalize and return fallback results
        const normalizedFallback = fallbackConversations.map(c => {
          const latest = c.latestMessage;
          const senderId = latest.senderId?.toString?.() || '';
          const receiverId = latest.receiverId?.toString?.() || '';
          const meId = queryUserId.toString();

          let partner = {
            id: senderId === meId ? receiverId : senderId,
            email: senderId === meId ? latest.receiverEmail : latest.senderEmail,
            role: senderId === meId ? latest.receiverRole : latest.senderRole,
            name: senderId === meId ? latest.receiverName : latest.senderName
          };

          return {
            conversationId: c._id,
            latestMessage: latest,
            messageCount: c.messageCount || 0,
            unreadCount: c.unreadCount || 0,
            partner
          };
        });

        return res.json(normalizedFallback);
      }
    }

    // Normalize conversations for frontend: provide conversationId and partner info
    const normalized = conversations.map(c => {
      const convoId = c._id;
      const latest = c.latestMessage || {};
      // Determine the other participant
      const senderId = latest.senderId?.toString?.() || '';
      const receiverId = latest.receiverId?.toString?.() || '';
      const meId = queryUserId.toString();

      let partner = {
        id: senderId === meId ? receiverId : senderId,
        email: senderId === meId ? latest.receiverEmail : latest.senderEmail,
        role: senderId === meId ? latest.receiverRole : latest.senderRole,
        name: senderId === meId ? latest.receiverName : latest.senderName
      };

      return {
        conversationId: convoId,
        latestMessage: latest,
        messageCount: c.messageCount || 0,
        unreadCount: c.unreadCount || 0,
        partner
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('[getConversations] ❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
};

// Get messages in a specific conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = req.user;

    if (!user || !user.id) {
      console.error('[getMessages] ❌ No user authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[getMessages] Fetching conversationId:', conversationId, 'for user:', user.id);

    // Resolve admin ID if necessary (to match sendMessage admin resolution)
    let queryUserId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) {
        queryUserId = adminRecord._id;
        console.log('[getMessages] Admin ID resolved to:', queryUserId.toString());
      }
    }

    // Fetch messages
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 });

    console.log('[getMessages] ✓ Found', messages.length, 'messages');

    // Mark received messages as read
    const updateResult = await ChatMessage.updateMany(
      {
        conversationId,
        receiverId: queryUserId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    console.log('[getMessages] ✓ Marked', updateResult.modifiedCount, 'messages as read');

    res.json(messages);
  } catch (err) {
    console.error('[getMessages] ❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

// Get messages with a specific user (for admin - auto-generates conversation ID)
export const getMessagesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user;

    if (!user || !user.id) {
      console.error('[getMessagesByUser] ❌ No user authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[getMessagesByUser] ====== START ======');
    console.log('[getMessagesByUser] Admin/Employee:', user.id, 'role:', user.role);
    console.log('[getMessagesByUser] Querying User:', userId);

    // CRITICAL: For admins/employees, we need the SAME admin ID used by sendMessage
    // The sendMessage function uses Admin.findOne({}) to get THE admin
    // So we should also use Admin.findOne({}) here to ensure consistency
    let resolvedAdminId = user.id;
    if (user.role === 'admin' || user.role === 'employee') {
      console.log('[getMessagesByUser] Admin/Employee detected, looking up THE admin record...');
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) {
        resolvedAdminId = adminRecord._id.toString();
        console.log('[getMessagesByUser] THE Admin ID resolved to:', resolvedAdminId);
      } else {
        console.error('[getMessagesByUser] ❌ No admin found in Admin collection');
        return res.status(404).json({ error: 'Admin not found' });
      }
    }

    // Convert IDs to ObjectIds for consistency
    const adminId = new mongoose.Types.ObjectId(resolvedAdminId);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Generate conversation ID (same logic as sendMessage - MUST match)
    const conversationId = generateConversationId(adminId, userIdObj);
    console.log('[getMessagesByUser] Generated conversationId:', conversationId);

    // Fetch messages
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 });

    console.log('[getMessagesByUser] ✓ Found', messages.length, 'messages');
    if (messages.length > 0) {
      console.log('[getMessagesByUser] Sample message:', {
        _id: messages[0]._id,
        senderRole: messages[0].senderRole,
        senderEmail: messages[0].senderEmail,
        conversationId: messages[0].conversationId
      });
    }

    // Mark received messages as read if admin/employee
    if (user.role === 'admin' || user.role === 'employee') {
      const updateResult = await ChatMessage.updateMany(
        {
          conversationId,
          receiverId: adminId,
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );
      console.log('[getMessagesByUser] ✓ Marked', updateResult.modifiedCount, 'messages as read');
    }

    console.log('[getMessagesByUser] ====== END ======');
    res.json(messages);
  } catch (err) {
    console.error('[getMessagesByUser] ❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

// Get unread message count for a user
export const getUnreadCount = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Resolve admin/employee id for count
    let queryUserId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) queryUserId = adminRecord._id;
    }

    const count = await ChatMessage.countDocuments({
      receiverId: queryUserId,
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count', details: err.message });
  }
};

// Get all users who have chatted with current user (for admin to see all users)
export const getChatUsers = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Resolve admin/employee ID to match conversation records
    let queryUserId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) queryUserId = adminRecord._id;
    }

    const chatUsers = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: queryUserId },
            { receiverId: queryUserId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          users: {
            $addToSet: {
              $cond: [
                { $eq: ['$senderId', queryUserId] },
                {
                  userId: '$receiverId',
                  role: '$receiverRole',
                  email: '$receiverEmail',
                  name: '$receiverName'
                },
                {
                  userId: '$senderId',
                  role: '$senderRole',
                  email: '$senderEmail',
                  name: '$senderName'
                }
              ]
            }
          }
        }
      },
      {
        $unwind: '$users'
      },
      {
        $sort: { 'users.email': 1 }
      }
    ]);

    const users = chatUsers.length > 0 ? chatUsers[0].users : [];
    res.json(users);
  } catch (err) {
    console.error('getChatUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch chat users', details: err.message });
  }
};

// Delete a message (soft delete - mark as deleted)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.senderId.toString() !== user.id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await ChatMessage.findByIdAndDelete(messageId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('deleteMessage error:', err);
    res.status(500).json({ error: 'Failed to delete message', details: err.message });
  }
};

// Search messages in conversations
export const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Resolve admin/employee to standardized Admin record for searches
    let queryUserId = new mongoose.Types.ObjectId(user.id);
    if (user.role === 'admin' || user.role === 'employee') {
      const adminRecord = await Admin.findOne({}).sort({ _id: 1 }).select('_id');
      if (adminRecord) queryUserId = adminRecord._id;
    }

    const messages = await ChatMessage.find({
      $or: [
        { senderId: queryUserId },
        { receiverId: queryUserId }
      ],
      message: { $regex: query, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    console.error('searchMessages error:', err);
    res.status(500).json({ error: 'Failed to search messages', details: err.message });
  }
};

// DEBUG: Get all chat messages (for debugging only)
export const getAllMessages = async (req, res) => {
  try {
    const allMessages = await ChatMessage.find({}).sort({ createdAt: -1 }).limit(50);
    res.json({
      totalCount: allMessages.length,
      messages: allMessages.map(m => ({
        _id: m._id.toString(),
        senderId: m.senderId.toString(),
        senderRole: m.senderRole,
        senderEmail: m.senderEmail,
        receiverId: m.receiverId.toString(),
        receiverEmail: m.receiverEmail,
        conversationId: m.conversationId,
        message: m.message.substring(0, 50),
        createdAt: m.createdAt
      }))
    });
  } catch (err) {
    console.error('getAllMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch all messages', details: err.message });
  }
};

// DEBUG: Check admin state and fix if needed
export const debugAdminState = async (req, res) => {
  try {
    const allAdmins = await Admin.find({}).select('_id email firstName lastName');
    console.log('[debugAdminState] All admins:', allAdmins);

    if (allAdmins.length === 0) {
      console.warn('[debugAdminState] No admins found! Creating default admin...');
      const newAdmin = new Admin({
        email: 'admin@zumarlaw.com',
        password: 'temp_password_change_me',
        firstName: 'Admin',
        lastName: 'User'
      });
      await newAdmin.save();
      console.log('[debugAdminState] ✓ Created admin:', newAdmin._id.toString());
      return res.json({
        status: 'admin_created',
        admin: {
          _id: newAdmin._id.toString(),
          email: newAdmin.email
        }
      });
    }

    // Return all admins
    res.json({
      status: 'ok',
      totalAdmins: allAdmins.length,
      admins: allAdmins.map(a => ({
        _id: a._id.toString(),
        email: a.email
      }))
    });
  } catch (err) {
    console.error('[debugAdminState] Error:', err.message);
    res.status(500).json({ error: 'Failed to check admin state', details: err.message });
  }
};
