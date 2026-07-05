const MedicalRecord = require('../models/MedicalRecord');

exports.createRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getRecordsByPatient = async (req, res) => {
  try {
    if (req.user.role === 'patient' && String(req.user._id) !== req.params.patientId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRecordByAppointment = async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ appointmentId: req.params.appointmentId })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    if (!record) return res.status(404).json({ message: 'No record found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
