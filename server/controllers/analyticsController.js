const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

exports.getSummary = async (req, res) => {
  try {
    const { doctorId, days = 7 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));
    from.setHours(0, 0, 0, 0);

    const match = { date: { $gte: from } };
    if (doctorId) match.doctorId = new mongoose.Types.ObjectId(doctorId);

    const data = await Appointment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
          noshow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          avgDuration: { $avg: '$actualDurationMinutes' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSpecialties = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rawData = await Appointment.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doc' } },
      { $unwind: '$doc' },
      { $group: { _id: '$doc.specialty', count: { $sum: 1 } } },
    ]);

    const mapSpecialtyToDept = (specialty) => {
      const s = specialty?.toLowerCase() || '';
      if (s.includes('cardio')) return 'Cardiology';
      if (s.includes('dermat')) return 'Dermatology';
      if (s.includes('ortho')) return 'Orthopedics';
      if (s.includes('pediat')) return 'Pediatrics';
      if (s.includes('gyneco')) return 'Gynecology';
      return 'General OPD';
    };

    const deptMap = {};
    rawData.forEach((item) => {
      const dept = mapSpecialtyToDept(item._id);
      deptMap[dept] = (deptMap[dept] || 0) + item.count;
    });

    const data = Object.entries(deptMap).map(([name, count]) => ({
      _id: name,
      count
    })).sort((a, b) => b.count - a.count);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
