const Doctor = require('../models/Doctor');
const User = require('../models/User');

exports.getDoctors = async (req, res) => {
  try {
    const { specialty, available, q, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    
    if (specialty) {
      filter.specialty = new RegExp(specialty, 'i');
    }
    
    if (q) {
      const User = require('../models/User');
      const matchingUsers = await User.find({
        role: 'doctor',
        name: new RegExp(q, 'i')
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      
      filter.$or = [
        { userId: { $in: userIds } },
        { specialty: new RegExp(q, 'i') }
      ];
    }
    
    if (available === 'true') filter.isAvailableToday = true;

    const doctors = await Doctor.find(filter)
      .populate('userId', 'name email phone profilePhoto')
      .sort({ avgRating: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(filter);
    res.json({ doctors, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone profilePhoto');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Not found' });

    const allowed = ['bio', 'consultationFee', 'followUpFee', 'languages',
      'isAvailableToday', 'checkedInAt', 'checkedOutAt', 'photo'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const updated = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('userId', 'name');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    doctor.isActive = false;
    await doctor.save();

    if (doctor.userId) {
      await User.findByIdAndUpdate(doctor.userId, { isActive: false });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

