const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, doctorData, patientData } = req.body;

    // Validate Gmail format
    if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Email must be in format name@gmail.com' });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: hashedPassword,
      role: role || 'patient',
      patient: patientData,
    });

    // If registering as doctor, create doctor profile too
    if (role === 'doctor' && doctorData) {
      await Doctor.create({ userId: user._id, ...doctorData });
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'patient', 'profilePhoto', 'fcmToken'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json(user.toPublic());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admins from deactivating themselves
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Toggle active status
    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    // If target is a doctor, synchronize the status in the Doctor model
    if (targetUser.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { userId: targetUser._id },
        { isActive: targetUser.isActive }
      );
    }

    res.json({
      message: `User ${targetUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: targetUser.toPublic(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
