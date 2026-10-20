import User from '../models/User.js';
export async function complaintCustomerLookup(req, res) {
  if (!['admin', 'employee'].includes(req.user?.role)) return res.status(403).json({ message: 'Staff access required' });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search.length > 120) return res.status(400).json({ message: 'Search is too long' });
  const filter = { isAdmin: { $ne: true }, isActive: { $ne: false } };
  if (search) filter.$and = search.split(/\s+/).map(term => {
    const regex = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $or: ['firstName', 'lastName', 'email', 'phoneNumber'].map(key => ({ [key]: { $regex: regex, $options: 'i' } })) };
  });
  const users = await User.find(filter).select('firstName lastName email phoneNumber cnic').sort({ firstName: 1, _id: 1 }).limit(50).lean();
  return res.json(users.map(user => ({ _id: user._id, name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    email: user.email, phone: user.phoneNumber || '', cnic: user.cnic || '' })));
}
