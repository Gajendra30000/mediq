const crypto = require('crypto');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorSlot = require('../models/DoctorSlot');

// Helper: get today's date at midnight
const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: generate next queue number for a doctor on a date
const getNextQueueNumber = async (doctorId, date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const last = await Appointment.findOne({ doctorId, date: { $gte: start, $lt: end } })
    .sort({ queueNumber: -1 });
  return (last?.queueNumber || 0) + 1;
};

// Helper: generate random 5-6 char uppercase alphanumeric token
const generateAlphanumericToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Helper: get base start time for dynamic queue calculations
const getBaseTime = async (doctorId, date, startHour, startMin, avgDurationMinutes) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = targetDate.toDateString() === new Date().toDateString();
  let baseTime;

  if (isToday) {
    const servingAppt = await Appointment.findOne({
      doctorId,
      date: { $gte: targetDate, $lt: tomorrow },
      status: 'in_consultation'
    });

    let startTimeAnchor = Date.now();
    if (servingAppt) {
      const avgDurationMs = avgDurationMinutes * 60 * 1000;
      const calledAtTime = servingAppt.calledAt ? new Date(servingAppt.calledAt).getTime() : Date.now();
      const expectedEndTime = calledAtTime + avgDurationMs;
      startTimeAnchor = Math.max(Date.now(), expectedEndTime);
    }
    
    baseTime = new Date(startTimeAnchor);
    
    const slotStartTime = new Date(targetDate);
    slotStartTime.setHours(startHour, startMin, 0, 0);
    if (baseTime < slotStartTime) {
      baseTime = slotStartTime;
    }
  } else {
    baseTime = new Date(targetDate);
    baseTime.setHours(startHour, startMin, 0, 0);
  }

  return baseTime;
};

// Helper: recalculate live queue positions for a doctor
const recalculateQueue = async (doctorId, io, date = new Date()) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const queue = await Appointment.find({
    doctorId,
    date: { $gte: targetDate, $lt: tomorrow },
    status: 'waiting',
  }).sort({ queueNumber: 1 });

  // Get doctor's avg consult time
  const doctorDoc = await Doctor.findById(doctorId).populate('userId', 'name');
  const slot = await DoctorSlot.findOne({ 
    doctorId,
    dayOfWeek: targetDate.getDay(),
    isActive: true
  });

  const startTimeStr = slot?.startTime || '09:00';
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const avgDurationMinutes = doctorDoc?.avgConsultTime || doctorDoc?.avgConsultationTime || 15;

  const baseTime = await getBaseTime(doctorId, targetDate, startHour, startMin, avgDurationMinutes);

  // Update positions and ETAs
  for (let i = 0; i < queue.length; i++) {
    const queuePosition = i + 1;
    const estTime = new Date(baseTime.getTime() + i * avgDurationMinutes * 60 * 1000);
    const estimatedTime = `${String(estTime.getHours()).padStart(2, '0')}:${String(estTime.getMinutes()).padStart(2, '0')}`;

    queue[i].queuePosition = queuePosition;
    queue[i].estimatedTime = estimatedTime;
    queue[i].timeSlot = estimatedTime;
    await queue[i].save();
  }

  // Emit updated queue to relevant rooms
  if (io) {
    const fullQueue = await Appointment.find({
      doctorId,
      date: { $gte: targetDate, $lt: tomorrow },
    })
      .sort({ queueNumber: 1 })
      .populate('patientId', 'name patient');

    const dateStr = targetDate.toISOString().split('T')[0];
    io.to(`doctor:${doctorId}`).emit('queueUpdated', { queue: fullQueue, date: dateStr, doctorId });
    io.to('hospital').emit('queueUpdated', { queue: fullQueue, date: dateStr, doctorId });

    // Notify each waiting patient individually
    queue.forEach((appt) => {
      io.to(`patient:${appt.patientId}`).emit('appointmentUpdated', {
        appointmentId: appt._id,
        queuePosition: appt.queuePosition,
        estimatedTime: appt.estimatedTime,
        status: appt.status,
      });
    });
  }
};

exports.recalculateQueue = recalculateQueue;

exports.getAppointments = async (req, res) => {
  try {
    const { status, upcoming, page = 1, limit = 20 } = req.query;
    const filter = { patientId: req.user._id };

    if (status) filter.status = status;
    if (upcoming === 'true') {
      filter.date = { $gte: todayMidnight() };
      filter.status = { $in: ['waiting', 'in_consultation'] };
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .sort({ date: upcoming === 'true' ? 1 : -1, timeSlot: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('doctorId', 'specialty consultationFee avgRating')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name profilePhoto' } });

    res.json({ appointments, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ message: 'doctorId and date required' });

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    const schedule = await DoctorSlot.findOne({ doctorId, dayOfWeek, isActive: true });
    if (!schedule) return res.json({ slots: [], message: 'Doctor not available this day' });

    // Generate all time slots for the session
    const slots = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + schedule.slotDuration <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // Check if it's a break
      const inBreak = schedule.breaks.some((b) => {
        const [bh, bm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        return current >= bh * 60 + bm && current < eh * 60 + em;
      });

      if (!inBreak) slots.push(timeStr);
      current += schedule.slotDuration;
    }

    // Find booked slots on this date
    const dayStart = new Date(requestedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await Appointment.find({
      doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ['cancelled', 'no_show'] },
    }).select('timeSlot');

    const bookedTimes = new Set(booked.map((a) => a.timeSlot));
    const availableSlots = slots.map((s) => ({ time: s, available: !bookedTimes.has(s) }));

    res.json({ slots: availableSlots, schedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNextQueueDetails = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    appointmentDate.setHours(0, 0, 0, 0);
    
    // Get doctor and their slot schedule
    const doctor = await Doctor.findById(doctorId).populate('userId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    
    const slot = await DoctorSlot.findOne({ 
      doctorId,
      dayOfWeek: appointmentDate.getDay(),
      isActive: true
    });
    
    if (!slot) {
      return res.status(400).json({ message: 'Doctor not available on this day' });
    }
    
    // Get next queue number for this date
    const nextQueueNum = await getNextQueueNumber(doctorId, appointmentDate);
    
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const avgDurationMinutes = doctor.avgConsultTime || 15;
    
    const baseTime = await getBaseTime(doctorId, appointmentDate, startHour, startMin, avgDurationMinutes);
    const activeCount = await Appointment.countDocuments({
      doctorId,
      date: { $gte: appointmentDate, $lt: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000) },
      status: 'waiting'
    });
    
    const estimatedTime = new Date(baseTime.getTime() + activeCount * avgDurationMinutes * 60 * 1000);
    
    // Format time as HH:MM
    const hours = String(estimatedTime.getHours()).padStart(2, '0');
    const minutes = String(estimatedTime.getMinutes()).padStart(2, '0');
    const estimatedTimeString = `${hours}:${minutes}`;
    
    res.json({
      queueNumber: activeCount + 1,
      estimatedTime: estimatedTimeString,
      estimatedDate: appointmentDate.toISOString().split('T')[0],
      avgDurationMinutes
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, type, symptoms, patientNotes, patientId } = req.body;

    const pid = req.user.role === 'reception' && patientId ? patientId : req.user._id;

    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    const doctor = await Doctor.findById(doctorId);
    const slot = await DoctorSlot.findOne({ 
      doctorId,
      dayOfWeek: appointmentDate.getDay(),
      isActive: true
    });
    
    if (!slot) {
      return res.status(400).json({ message: 'Doctor not available on this day' });
    }
    
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const avgDurationMinutes = doctor?.avgConsultTime || doctor?.avgConsultationTime || 15;

    const start = new Date(appointmentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Check maximum booking limit of 50
    const totalBookings = await Appointment.countDocuments({
      doctorId,
      date: { $gte: start, $lt: end },
    });
    if (totalBookings >= 50) {
      return res.status(400).json({ message: 'Maximum booking limit of 50 reached for today' });
    }

    const qrToken = crypto.randomBytes(16).toString('hex');

    let appointment;
    let retries = 3;
    while (retries > 0) {
      try {
        const currentQueueNum = await getNextQueueNumber(doctorId, appointmentDate);
        const randomToken = generateAlphanumericToken();
        
        const activeCount = await Appointment.countDocuments({
          doctorId,
          date: { $gte: start, $lt: end },
          status: 'waiting'
        });
        const currentQueuePos = activeCount + 1;
        
        const baseTime = await getBaseTime(doctorId, appointmentDate, startHour, startMin, avgDurationMinutes);
        const estimatedTime = new Date(baseTime.getTime() + activeCount * avgDurationMinutes * 60 * 1000);
        const finalTimeSlot = `${String(estimatedTime.getHours()).padStart(2, '0')}:${String(estimatedTime.getMinutes()).padStart(2, '0')}`;

        appointment = await Appointment.create({
          patientId: pid,
          doctorId,
          date: appointmentDate,
          timeSlot: finalTimeSlot,
          estimatedTime: finalTimeSlot,
          tokenNumber: randomToken,
          queueNumber: currentQueueNum,
          queuePosition: currentQueuePos,
          type: type || 'scheduled',
          symptoms,
          patientNotes,
          qrToken,
          status: 'waiting',
        });
        break;
      } catch (err) {
        if (err.code === 11000 && retries > 1) {
          retries--;
          continue;
        }
        throw err;
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to('hospital').emit('appointment:new', { appointment });
    }
    await recalculateQueue(doctorId, io, appointmentDate);

    res.status(201).json({ appointment });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createWalkIn = async (req, res) => {
  try {
    const { doctorId, patientId, symptoms } = req.body;

    const today = todayMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const doctor = await Doctor.findById(doctorId);
    const slot = await DoctorSlot.findOne({ 
      doctorId,
      dayOfWeek: today.getDay(),
      isActive: true
    });
    
    if (!slot) {
      return res.status(400).json({ message: 'Doctor not available today' });
    }
    
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const avgDurationMinutes = doctor?.avgConsultTime || doctor?.avgConsultationTime || 15;

    // Check maximum booking limit of 50
    const totalBookings = await Appointment.countDocuments({
      doctorId,
      date: { $gte: today, $lt: tomorrow },
    });
    if (totalBookings >= 50) {
      return res.status(400).json({ message: 'Maximum booking limit of 50 reached for today' });
    }

    const queueNumber = await getNextQueueNumber(doctorId, today);
    const tokenNumber = generateAlphanumericToken();

    const activeCount = await Appointment.countDocuments({
      doctorId,
      date: { $gte: today, $lt: tomorrow },
      status: 'waiting'
    });
    const queuePosition = activeCount + 1;

    const baseTime = await getBaseTime(doctorId, today, startHour, startMin, avgDurationMinutes);
    const estimatedTime = new Date(baseTime.getTime() + activeCount * avgDurationMinutes * 60 * 1000);
    const finalTimeSlot = `${String(estimatedTime.getHours()).padStart(2, '0')}:${String(estimatedTime.getMinutes()).padStart(2, '0')}`;

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date: today,
      timeSlot: finalTimeSlot,
      estimatedTime: finalTimeSlot,
      tokenNumber,
      queueNumber,
      queuePosition,
      type: 'walkin',
      status: 'waiting',
      qrToken: crypto.randomBytes(16).toString('hex'),
    });

    await recalculateQueue(doctorId, req.app.get('io'), today);

    res.status(201).json(appointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.checkInQR = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ qrToken: req.params.qrToken });
    if (!appointment) return res.status(404).json({ message: 'Invalid QR token' });
    if (appointment.status !== 'waiting') {
      return res.status(400).json({ message: `Cannot check in: status is ${appointment.status}` });
    }

    appointment.status = 'in_consultation';
    appointment.checkedInAt = new Date();
    await appointment.save();

    // Recalculate queue
    await recalculateQueue(appointment.doctorId, req.app.get('io'), appointment.date);

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId');

    res.json({ appointment: populated, message: 'Checked in successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name profilePhoto' } });

    if (!appointment) return res.status(404).json({ message: 'Not found' });

    // Patients can only see their own
    if (req.user.role === 'patient' && String(appointment.patientId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Not found' });

    const cancellableStatuses = ['waiting', 'in_consultation'];
    if (!cancellableStatuses.includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel at this stage' });
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = req.user.role === 'patient' ? 'patient' : req.user.role;
    appointment.cancellationReason = req.body.reason;
    await appointment.save();

    await recalculateQueue(appointment.doctorId, req.app.get('io'), appointment.date);

    res.json({ message: 'Appointment cancelled', appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
