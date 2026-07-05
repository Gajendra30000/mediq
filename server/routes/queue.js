const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const queueController = require('../controllers/queueController');

// GET /api/queue/today/:doctorId — full queue for a doctor today or specific date
router.get('/today/:doctorId', protect, queueController.getQueueToday);

// PATCH /api/queue/call-next — doctor calls next patient
router.patch('/call-next', protect, requireRole('doctor', 'reception', 'admin'), queueController.callNext);

// PATCH /api/queue/call/:appointmentId — call specific patient
router.patch('/call/:appointmentId', protect, requireRole('doctor', 'reception', 'admin'), queueController.callSpecific);

// PATCH /api/queue/complete — mark serving patient as done/skipped
router.patch('/complete', protect, requireRole('doctor', 'reception', 'admin'), queueController.completeQueueItem);

module.exports = router;
