import express from 'express';
import Roles from '../models/Roles.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Employee login
router.post('/employee-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Roles.findOne({ 'login.email': email });
    if (!employee) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, employee.login.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.login.email,
        assignedPages: employee.assignedPages,
        role: 'employee' // ✅ include role
      },

      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log('[DEBUG] JWT_SECRET in employee.routes.js:', process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all employees
router.get('/employees', async (req, res) => {
  try {
    const employees = await Roles.find({ role: 'employee' });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
