const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { recalculateQueue } = require('./appointmentsController');

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: recalculate and update doctor's average consultation time
const updateDoctorAvgConsultTime = async (doctorId) => {
  const recent = await Appointment.find({
    doctorId,
    status: 'completed',
    actualDurationMinutes: { $gt: 0, $lt: 120 }, // filter outliers
  })
    .sort({ completedAt: -1 })
    .limit(50)
    .select('actualDurationMinutes');

  if (recent.length > 0) {
    const avg = recent.reduce((sum, a) => sum + a.actualDurationMinutes, 0) / recent.length;
    await Doctor.findByIdAndUpdate(doctorId, {
      avgConsultTime: Math.round(avg),
      $inc: { totalConsultations: 1 },
    });
  }
};

exports.getQueueToday = async (req, res) => {
  try {
    const { date } = req.query;
    let start;
    if (date) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
    } else {
      start = todayMidnight();
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const queue = await Appointment.find({
      doctorId: req.params.doctorId,
      date: { $gte: start, $lt: end },
    })
      .sort({ queueNumber: 1 })
      .populate('patientId', 'name patient.dob patient.gender');

    const stats = {
      total: queue.length,
      waiting: queue.filter((a) => a.status === 'waiting').length,
      serving: queue.filter((a) => a.status === 'in_consultation').length,
      done: queue.filter((a) => a.status === 'completed').length,
      skipped: queue.filter((a) => a.status === 'skipped').length,
    };

    res.json({ queue, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.callNext = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const io = req.app.get('io');

    const today = todayMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mark any currently serving (in_consultation) as completed first
    await Appointment.updateMany(
      { doctorId, status: 'in_consultation' },
      { status: 'completed', completedAt: new Date() }
    );

    // Get next in queue (lowest queueNumber, status 'waiting')
    const next = await Appointment.findOne({
      doctorId,
      date: { $gte: today, $lt: tomorrow },
      status: 'waiting',
    })
      .sort({ queueNumber: 1 })
      .populate('patientId', 'name');

    if (!next) return res.json({ message: 'Queue is empty', next: null });

    next.status = 'in_consultation';
    next.calledAt = new Date();
    next.queuePosition = null; // no longer waiting
    await next.save();

    io.to(`patient:${next.patientId._id}`).emit('queue:called', {
      appointmentId: next._id,
      tokenNumber: next.tokenNumber,
    });

    // Recalculate remaining queue
    await recalculateQueue(doctorId, io, today);

    res.json({ message: 'Next patient called', appointment: next });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.callSpecific = async (req, res) => {
  try {
    const io = req.app.get('io');
    const appointment = await Appointment.findById(req.params.appointmentId).populate('patientId', 'name');
    if (!appointment) return res.status(404).json({ message: 'Not found' });

    // Validate that the appointment date is today
    const today = todayMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (appointment.date < today || appointment.date >= tomorrow) {
      return res.status(400).json({ message: 'You can only call patients booked for today' });
    }

    // Mark currently serving as completed
    await Appointment.updateMany(
      { doctorId: appointment.doctorId, status: 'in_consultation' },
      { status: 'completed', completedAt: new Date() }
    );

    appointment.status = 'in_consultation';
    appointment.calledAt = new Date();
    appointment.queuePosition = null;
    await appointment.save();

    io.to(`patient:${appointment.patientId._id}`).emit('queue:called', {
      appointmentId: appointment._id,
      tokenNumber: appointment.tokenNumber,
    });

    await recalculateQueue(appointment.doctorId, io, appointment.date);

    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.completeQueueItem = async (req, res) => {
  try {
    const { appointmentId, action = 'done' } = req.body; // action: 'done' | 'skip'
    const io = req.app.get('io');

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Not found' });

    // Validate that the appointment date is today
    const today = todayMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (appointment.date < today || appointment.date >= tomorrow) {
      return res.status(400).json({ message: 'You can only manage patients booked for today' });
    }

    const completedAt = new Date();
    appointment.completedAt = completedAt;

    if (action === 'done') {
      appointment.status = 'completed';
    } else if (action === 'skip') {
      appointment.status = 'skipped';
    }

    appointment.queuePosition = null;
    await appointment.save();
    
    await recalculateQueue(appointment.doctorId, io, appointment.date);

    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
