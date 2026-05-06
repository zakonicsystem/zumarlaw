import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: String,
            enum: ['user', 'admin'],
            required: true
        },
        senderName: String,
        senderEmail: String,
        senderPhone: String,
        senderId: mongoose.Schema.Types.ObjectId,
        subject: String,
        message: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const contactSubmissionSchema = new mongoose.Schema(
    {
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            sparse: true
        },
        userName: String,
        userPhone: String,
        messages: [messageSchema],
        lastMessage: String,
        lastMessageAt: Date,
        lastMessageSender: {
            type: String,
            enum: ['user', 'admin']
        },
        messageCount: {
            type: Number,
            default: 0
        },
        unreadCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'closed', 'pending'],
            default: 'active'
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        ipAddress: String,
        userAgent: String
    },
    { timestamps: true }
);

export default mongoose.model('ContactSubmission', contactSubmissionSchema);
