const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getQueueData = async (doctorId) => {
  const today = todayMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [queue, doctor] = await Promise.all([
    Appointment.find({
      doctorId,
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled', 'no_show'] },
    })
      .sort({ queueNumber: 1 })
      .populate('patientId', 'name'),
    Doctor.findById(doctorId).populate('userId', 'name'),
  ]);

  const serving = queue.find((a) => a.status === 'in_consultation');
  const waiting = queue.filter((a) =>
    a.status === 'waiting'
  );

  return {
    doctorName: doctor?.userId?.name || 'Doctor',
    specialty: doctor?.specialty || '',
    serving: serving
      ? { token: serving.tokenNumber, name: serving.patientId?.name }
      : null,
    next3: waiting.slice(0, 3).map((a) => ({
      token: a.tokenNumber,
      eta: a.estimatedWaitMinutes,
    })),
    waitingCount: waiting.length,
    doneCount: queue.filter((a) => a.status === 'completed').length,
    avgConsultTime: doctor?.avgConsultTime || 10,
    timestamp: new Date().toISOString(),
  };
};

exports.sse = async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  const send = async () => {
    try {
      const data = await getQueueData(req.params.doctorId);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
    }
  };

  await send();
  const interval = setInterval(send, 8000); // push every 8s

  // Listen for queue updates to push immediately (not just on interval)
  const io = req.app.get('io');
  const onQueueUpdate = () => send();
  if (io) {
    const doctorRoom = `doctor:${req.params.doctorId}`;
    // Use a namespaced event listener that we can clean up
    io.of('/').adapter.on('join', (room) => {
      if (room === doctorRoom) onQueueUpdate();
    });
  }

  req.on('close', () => {
    clearInterval(interval);
  });
};

exports.getSnapshot = async (req, res) => {
  try {
    const data = await getQueueData(req.params.doctorId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDisplayDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({
      isActive: true,
      isAvailableToday: true,
    }).populate('userId', 'name');
    res.json(doctors.map((d) => ({ _id: d._id, name: d.userId?.name, specialty: d.specialty })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
