const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorSlot = require('../models/DoctorSlot');
const mongoose = require('mongoose');

exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalToday, serving, waiting, done, doctorsCount] = await Promise.all([
      Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ status: 'in_consultation', date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ status: 'waiting', date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ status: 'completed', date: { $gte: today, $lt: tomorrow } }),
      Doctor.countDocuments({ isActive: true, isAvailableToday: true }),
    ]);

    // Calculate department loads
    const docs = await Doctor.find({ isActive: true });
    const doctorIds = docs.map((d) => d._id);

    const appts = await Appointment.find({
      doctorId: { $in: doctorIds },
      date: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' }
    });

    const slots = await DoctorSlot.find({
      doctorId: { $in: doctorIds },
      dayOfWeek: today.getDay(),
      isActive: true
    });

    const mapSpecialtyToDept = (specialty) => {
      const s = specialty?.toLowerCase() || '';
      if (s.includes('cardio')) return 'Cardiology';
      if (s.includes('dermat')) return 'Dermatology';
      if (s.includes('ortho')) return 'Orthopedics';
      if (s.includes('pediat')) return 'Pediatrics';
      if (s.includes('gyneco')) return 'Gynecology';
      return 'General OPD';
    };

    const specialtyMap = {};
    const hospitalDepts = ['Cardiology', 'General OPD', 'Orthopedics', 'Dermatology', 'Pediatrics', 'Gynecology'];

    hospitalDepts.forEach((dept) => {
      specialtyMap[dept] = { name: dept, current: 0, capacity: 0 };
    });

    docs.forEach((doc) => {
      const dept = mapSpecialtyToDept(doc.specialty);
      if (!specialtyMap[dept]) {
        specialtyMap[dept] = { name: dept, current: 0, capacity: 0 };
      }
      const docSlots = slots.filter((s) => String(s.doctorId) === String(doc._id));
      const docCapacity = docSlots.reduce((sum, s) => sum + (s.maxPatients || 20), 0) || 20;
      specialtyMap[dept].capacity += docCapacity;
    });

    appts.forEach((appt) => {
      const doc = docs.find((d) => String(d._id) === String(appt.doctorId));
      const dept = mapSpecialtyToDept(doc?.specialty);
      if (specialtyMap[dept]) {
        specialtyMap[dept].current += 1;
      }
    });

    const departmentLoads = Object.values(specialtyMap);

    const waitStats = await Appointment.aggregate([
      { $match: { status: 'completed', date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, avgWait: { $avg: '$actualDurationMinutes' } } },
    ]);

    res.json({
      totalToday, serving, waiting, done, doctors: doctorsCount,
      avgWaitMinutes: waitStats[0]?.avgWait ? Math.round(waitStats[0].avgWait) : 0,
      departmentLoads
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .populate('userId', 'name email phone profilePhoto');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
