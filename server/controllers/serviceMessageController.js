import ServiceMessage from '../models/Servicemessage.js';
import cpaas from '../services/cpaasService.js';
import Service from '../models/Service.js';
import PersonalDetail from '../models/PersonalDetail.js';
import mongoose from 'mongoose';

// Send a message (alert or update) to a user AND send SMS
export const sendMessage = async (req, res) => {
  try {
    const { userId, serviceId, type, message, phone } = req.body;
    if (!userId || !type || !message) {
      return res.status(400).json({ error: 'userId, type, and message are required' });
    }

    // Save in-app message
    const newMsg = await ServiceMessage.create({
      userId,
      serviceId,
      type,
      message,
      createdAt: new Date(),
    });

    // Send SMS if phone number is provided
    let smsSent = false;
    let smsError = null;
    if (phone) {
      try {
        await cpaas.sendCustomSMS(phone, message);
        smsSent = true;
        console.log(`SMS sent successfully to ${phone}`);
      } catch (smsErr) {
        smsError = smsErr.message;
        console.error(`SMS failed for ${phone}:`, smsErr);
      }
    }

    res.json({
      ...newMsg.toObject(),
      smsSent,
      smsError: smsError || null
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

// Get all messages for a service or user
export const getMessages = async (req, res) => {
  try {
    const { serviceId, userId } = req.query;
    let query = {};
    if (serviceId) {
      if (mongoose.Types.ObjectId.isValid(serviceId)) {
        query.serviceId = new mongoose.Types.ObjectId(serviceId);
      } else {
        query.serviceId = serviceId;
      }
    }
    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = new mongoose.Types.ObjectId(userId);
      } else {
        query.userId = userId;
      }
    }
    console.log('ServiceMessage query:', query);
    const messages = await ServiceMessage.find(query).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error('ServiceMessage fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};