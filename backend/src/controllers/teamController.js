import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { AuditLog } from '../models/AuditLog.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = { organization: req.orgId };
    if (role) filter.role = role;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

export const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({
      organization: req.orgId,
      role: { $in: ['agent', 'supervisor', 'admin'] },
      isActive: true
    }).select('name email role avatar department');

    res.json({ success: true, agents });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, department } = req.body;

    if (!['admin', 'supervisor', 'agent', 'customer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role specified.' });
    }

    const user = await User.findOne({ _id: userId, organization: req.orgId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in this organization.' });
    }

    const oldRole = user.role;
    user.role = role;
    if (department) user.department = department;
    await user.save();

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'USER_ROLE_UPDATE',
      entityType: 'User',
      entityId: user._id.toString(),
      details: { previousRole: oldRole, newRole: role }
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};
