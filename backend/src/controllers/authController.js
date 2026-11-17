import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { AuditLog } from '../models/AuditLog.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'resolveai_super_secret_jwt_key_2026', {
    expiresIn: '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, organizationName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, and password.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    // Find or create default organization
    let org;
    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      org = await Organization.findOne({ slug });
      if (!org) {
        org = await Organization.create({
          name: organizationName,
          slug
        });
      }
    } else {
      org = await Organization.findOne({ slug: 'technova' });
      if (!org) {
        org = await Organization.create({
          name: 'TechNova Global',
          slug: 'technova'
        });
      }
    }

    const assignedRole = role && ['admin', 'supervisor', 'agent', 'customer'].includes(role)
      ? role
      : 'customer';

    const user = await User.create({
      organization: org._id,
      name,
      email,
      password,
      role: assignedRole
    });

    const token = generateToken(user._id);

    await AuditLog.create({
      organization: org._id,
      user: user._id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user._id.toString(),
      details: { email: user.email, role: user.role }
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: org
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password').populate('organization');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account has been deactivated.' });
    }

    const token = generateToken(user._id);

    await AuditLog.create({
      organization: user.organization._id,
      user: user._id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id.toString()
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        organization: user.organization
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('organization');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const getDemoAccounts = async (req, res, next) => {
  try {
    // Provide easy demo login accounts for evaluation
    const demoAccounts = [
      { role: 'admin', email: 'admin@technova.com', name: 'Sarah Chen (Admin)', defaultPass: 'admin123' },
      { role: 'supervisor', email: 'supervisor@technova.com', name: 'Marcus Vance (Supervisor)', defaultPass: 'super123' },
      { role: 'agent', email: 'agent@technova.com', name: 'Alex Rivera (Support Agent)', defaultPass: 'agent123' },
      { role: 'customer', email: 'customer@gmail.com', name: 'David Miller (Customer)', defaultPass: 'cust123' }
    ];
    res.json({ success: true, demoAccounts });
  } catch (error) {
    next(error);
  }
};
