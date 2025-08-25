import ServiceMessage from '../models/Servicemessage.js';
import mongoose from 'mongoose';

// Send a message (alert or update) to a user
export const sendMessage = async (req, res) => {
  try {
    const { userId, serviceId, type, message } = req.body;
    if (!userId || !type || !message) {
      return res.status(400).json({ error: 'userId, type, and message are required' });
    }
    const newMsg = await ServiceMessage.create({
      userId,
      serviceId,
      type,
      message,
      createdAt: new Date(),
    });
    res.json(newMsg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
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