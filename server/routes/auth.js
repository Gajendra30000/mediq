const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const authController = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', protect, authController.getMe);

// PATCH /api/auth/me  — update profile
router.patch('/me', protect, authController.updateMe);

// POST /api/auth/change-password
router.post('/change-password', protect, authController.changePassword);

// PATCH /api/auth/staff/:id/toggle-status
// Toggle isActive for staff members (single hospital)
router.patch('/staff/:id/toggle-status', protect, requireRole('admin'), authController.toggleStaffStatus);

module.exports = router;
