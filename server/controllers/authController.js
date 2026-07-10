const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate security key
    const securityKey = crypto.randomBytes(32).toString('hex');

    // Hash security key
    const securityKeySalt = await bcrypt.genSalt(12);
    const securityKeyHash = await bcrypt.hash(securityKey, securityKeySalt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      securityKeyHash,
    });

    await user.save();

    res.status(201).json({
      message: 'Registration successful',
      securityKey, // One-time only — never retrievable again
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, securityKey } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password +securityKeyHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email, password, or security key' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email, password, or security key' });
    }

    // Verify security key
    const isKeyValid = await bcrypt.compare(securityKey, user.securityKeyHash);
    if (!isKeyValid) {
      return res.status(401).json({ message: 'Invalid email, password, or security key' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/me — update profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/password — change password (requires current password + security key)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, securityKey } = req.body;
    if (!currentPassword || !newPassword || !securityKey) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findById(req.userId).select('+password +securityKeyHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPwValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPwValid) return res.status(401).json({ message: 'Invalid current password or security key' });

    const isKeyValid = await bcrypt.compare(securityKey, user.securityKeyHash);
    if (!isKeyValid) return res.status(401).json({ message: 'Invalid current password or security key' });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
