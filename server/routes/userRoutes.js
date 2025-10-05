import express from 'express';
import User from '../models/User.js'; // ✅ Adjust path if needed

const router = express.Router();

// // ✅ GET all users for admin (for Customers.jsx)
// router.get('/admin/customers', async (req, res) => {
//   try {
//     const users = await User.find().sort({ createdAt: -1 });

//     const transformedUsers = users.map(user => ({
//       _id: user._id,
//       name: `${user.firstName} ${user.lastName}`,
//       email: user.email,
//       phone: user.phoneNumber || 'N/A',
//       createdAt: user.createdAt,
//       services: [], // default
//       isActive: true // default
//     }));

//     res.status(200).json(transformedUsers);
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// ✅ Export the router
export default router;
