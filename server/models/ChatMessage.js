import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  // Conversation participants
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // User or Admin ID
  senderRole: { type: String, enum: ['user', 'admin', 'employee'], required: true }, // Track who sent it
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },

  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // Admin or User ID
  receiverRole: { type: String, enum: ['user', 'admin', 'employee'], required: true },
  receiverEmail: { type: String, required: true },

  // Message content
  message: { type: String, required: true },
  attachmentUrl: { type: String }, // Optional file attachment path
  attachmentName: { type: String },

  // Message status
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },

  // Metadata
  conversationId: { type: String, required: true, index: true }, // Unique conversation ID (sorted IDs)
  subject: { type: String }, // Optional subject line
  relatedRefundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' }, // Link to specific refund if applicable

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for faster conversation queries
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
