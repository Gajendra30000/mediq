const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Qualifications
    qualification: { type: String, required: true }, // e.g. "MBBS, MD"
    specialty: { type: String, required: true },     // e.g. "Cardiologist"
    subSpecialty: String,
    registrationNumber: String,
    experience: { type: Number, default: 0 },        // years
    languages: { type: [String], default: ['Hindi', 'English'] },

    bio: String,
    photo: String,

    // Fees
    consultationFee: { type: Number, default: 500 },
    followUpFee: { type: Number, default: 300 },

    // Performance (auto-updated)
    avgConsultTime: { type: Number, default: 10 }, // minutes, recalculated from actuals
    totalConsultations: { type: Number, default: 0 },

    // Today's status
    isAvailableToday: { type: Boolean, default: true },
    checkedInAt: Date,
    checkedOutAt: Date,

    // No-show prediction model weight (updated by ML service)
    noShowRate: { type: Number, default: 0.1 },

    isActive: { type: Boolean, default: true },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

doctorSchema.virtual('hospitalId').get(function () {
  return { _id: 'default-hospital', name: 'MediQueue Hospital' };
});

doctorSchema.index({ specialty: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);
