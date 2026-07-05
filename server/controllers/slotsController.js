const DoctorSlot = require('../models/DoctorSlot');

exports.getSlotsByDoctor = async (req, res) => {
  try {
    const slots = await DoctorSlot.find({ doctorId: req.params.doctorId, isActive: true });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSlot = async (req, res) => {
  try {
    const slot = await DoctorSlot.create(req.body);
    res.status(201).json(slot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const slot = await DoctorSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(slot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    await DoctorSlot.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Slot deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
