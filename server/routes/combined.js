const express = require('express');
const { protect, requireRole } = require('../middleware/auth');

// ── ANALYTICS ────────────────────────────────────────────────────────────────
const analyticsRouter = express.Router();
const analyticsController = require('../controllers/analyticsController');

analyticsRouter.get('/summary', protect, requireRole('admin', 'doctor', 'reception'), analyticsController.getSummary);
analyticsRouter.get('/specialties', protect, requireRole('admin'), analyticsController.getSpecialties);

module.exports.analyticsRouter = analyticsRouter;

// ── MEDICAL RECORDS ───────────────────────────────────────────────────────────
const recordsRouter = express.Router();
const recordsController = require('../controllers/recordsController');

recordsRouter.post('/', protect, requireRole('doctor', 'admin'), recordsController.createRecord);
recordsRouter.patch('/:id', protect, requireRole('doctor', 'admin'), recordsController.updateRecord);
recordsRouter.get('/patient/:patientId', protect, recordsController.getRecordsByPatient);
recordsRouter.get('/appointment/:appointmentId', protect, recordsController.getRecordByAppointment);

module.exports.recordsRouter = recordsRouter;

// ── DOCTORS ──────────────────────────────────────────────────────────────────
const doctorsRouter = express.Router();
const doctorsController = require('../controllers/doctorsController');

doctorsRouter.get('/', doctorsController.getDoctors);
doctorsRouter.get('/:id', doctorsController.getDoctorById);
doctorsRouter.patch('/:id', protect, doctorsController.updateDoctor);
doctorsRouter.delete('/:id', protect, requireRole('admin'), doctorsController.deleteDoctor);

module.exports.doctorsRouter = doctorsRouter;

// ── SLOTS ────────────────────────────────────────────────────────────────────
const slotsRouter = express.Router();
const slotsController = require('../controllers/slotsController');

slotsRouter.get('/:doctorId', slotsController.getSlotsByDoctor);
slotsRouter.post('/', protect, requireRole('doctor', 'admin'), slotsController.createSlot);
slotsRouter.patch('/:id', protect, requireRole('doctor', 'admin'), slotsController.updateSlot);
slotsRouter.delete('/:id', protect, requireRole('doctor', 'admin'), slotsController.deleteSlot);

module.exports.slotsRouter = slotsRouter;

// ── REVIEWS ──────────────────────────────────────────────────────────────────
const reviewsRouter = express.Router();
const { Review } = require('../models/ReviewNotification');
const Appointment = require('../models/Appointment');

reviewsRouter.post('/', protect, requireRole('patient'), async (req, res) => {
  try {
    const { appointmentId, doctorRating, hospitalRating, waitTimeRating, comment, tags, isAnonymous } = req.body;
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: req.user._id,
      status: 'completed',
    });
    
    if (!appointment) {
      return res.status(400).json({ message: 'Can only review completed appointments' });
    }

    const review = await Review.create({
      patientId: req.user._id,
      doctorId: appointment.doctorId,
      hospitalId: appointment.hospitalId?._id || appointment.hospitalId || 'default-hospital',
      appointmentId,
      doctorRating,
      hospitalRating,
      waitTimeRating,
      comment,
      tags,
      isAnonymous
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Already reviewed this appointment' });
    }
    res.status(400).json({ message: err.message });
  }
});

reviewsRouter.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const reviews = await Review.find({ doctorId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('patientId', 'name');

    const total = await Review.countDocuments({ doctorId });
    res.json({ reviews, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports.reviewsRouter = reviewsRouter;
