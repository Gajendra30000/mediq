const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const hospitalsController = require('../controllers/hospitalsController');

// GET /api/hospitals/:id/stats — dashboard stats
router.get('/:id/stats', protect, requireRole('admin', 'reception'), hospitalsController.getStats);

// GET /api/hospitals/:id/doctors — doctors list
router.get('/:id/doctors', hospitalsController.getDoctors);

module.exports = router;
