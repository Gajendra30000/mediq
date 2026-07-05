const mongoose = require('mongoose');

// Weekly schedule template for a doctor
const doctorSlotSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sun, 1=Mon...

    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "13:00"
    slotDuration: { type: Number, default: 15 }, // minutes per patient
    maxPatients: { type: Number, default: 20 },

    // Breaks within the session (e.g. lunch)
    breaks: [
      {
        startTime: String, // "11:00"
        endTime: String,   // "11:15"
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSlotSchema.index({ doctorId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('DoctorSlot', doctorSlotSchema);
