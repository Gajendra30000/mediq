const express = require('express');
const router = express.Router();
const { protect, requireRole, optionalAuth } = require('../middleware/auth');
const appointmentsController = require('../controllers/appointmentsController');

// GET /api/appointments — patient's own appointments
router.get('/', protect, appointmentsController.getAppointments);

// GET /api/appointments/available-slots — check available slots for a doctor on a date
router.get('/available-slots', optionalAuth, appointmentsController.getAvailableSlots);

// GET /api/appointments/next-queue/:doctorId/:date — get next queue position and estimated time
router.get('/next-queue/:doctorId/:date', protect, appointmentsController.getNextQueueDetails);

// POST /api/appointments — book appointment
router.post('/', protect, requireRole('patient', 'reception'), appointmentsController.bookAppointment);

// POST /api/appointments/walkin — reception creates walk-in
router.post('/walkin', protect, requireRole('reception', 'admin'), appointmentsController.createWalkIn);

// POST /api/appointments/checkin/:qrToken — QR check-in
router.post('/checkin/:qrToken', optionalAuth, appointmentsController.checkInQR);

// GET /api/appointments/:id
router.get('/:id', protect, appointmentsController.getAppointmentById);

// PATCH /api/appointments/:id/cancel
router.patch('/:id/cancel', protect, appointmentsController.cancelAppointment);

module.exports = router;
module.exports.recalculateQueue = appointmentsController.recalculateQueue;
