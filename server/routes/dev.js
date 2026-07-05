const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorSlot = require('../models/DoctorSlot');
const User = require('../models/User');
const { recalculateQueue } = require('./appointments');

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// POST /api/dev/create-test-appointment
// Body: { doctorId, patientId, status ('booked'|'checked_in'), timeSlot (optional) }
router.post('/create-test-appointment', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' });
  try {
    const { doctorId, patientId, status = 'booked', timeSlot } = req.body;
    const today = todayMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const last = await Appointment.findOne({ doctorId, date: { $gte: today, $lt: tomorrow } }).sort({ queueNumber: -1 });
    const queueNumber = (last?.queueNumber || 0) + 1;

    // Generate random 6-char alphanumeric token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tokenNumber = '';
    for (let i = 0; i < 6; i++) {
      tokenNumber += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const slot = await DoctorSlot.findOne({ doctorId, dayOfWeek: today.getDay(), isActive: true });
    const ts = timeSlot || (slot ? slot.startTime : `${String(new Date().getHours()).padStart(2,'0')}:00`);

    let pid = patientId;
    if (!pid) {
      const testUser = await User.create({
        name: `Test Patient ${Date.now()}`,
        email: `test.patient.${Date.now()}@example.com`,
        phone: '999000' + Math.floor(1000 + Math.random() * 9000),
        passwordHash: await bcrypt.hash('test', 12),
        role: 'patient',
      });
      pid = testUser._id;
    }

    const appt = await Appointment.create({
      patientId: pid,
      doctorId,
      date: today,
      timeSlot: ts,
      tokenNumber,
      queueNumber,
      type: 'scheduled',
      status,
      qrToken: require('crypto').randomBytes(12).toString('hex'),
      verificationCode: String(Math.floor(10000 + Math.random() * 90000)),
    });

    // Trigger recalc using server's io (will be attached to req.app in normal requests)
    const io = req.app.get('io');
    await recalculateQueue(doctorId, io, today);

    res.json({ appointment: appt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/dev/cleanup-appointments - Clear appointments collection
router.delete('/cleanup-appointments', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' });
  try {
    await Appointment.deleteMany({});
    console.log('✅ Cleared appointments collection');
    res.json({ message: 'Appointments collection cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
