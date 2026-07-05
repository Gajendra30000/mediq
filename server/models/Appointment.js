const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    date: { type: Date, required: true },           // The appointment date (midnight UTC)
    timeSlot: { type: String, required: true },     // "10:15"
    tokenNumber: { type: String, required: true },
    queueNumber: { type: Number, required: true },

    type: {
      type: String,
      enum: ['scheduled', 'walkin', 'followup', 'emergency'],
      default: 'scheduled',
    },

    status: {
      type: String,
      enum: ['waiting', 'in_consultation', 'completed', 'skipped', 'cancelled'],
      default: 'waiting',
    },

    symptoms: [String],             // patient-provided before booking
    aiSuggestedSpecialty: String,   // AI suggestion that led to this doctor

    // Queue position & timing
    queuePosition: Number,          // live position in today's queue
    estimatedWaitMinutes: Number,   // ETA from queue engine
    estimatedTime: String,

    // Timestamps
    checkedInAt: Date,
    calledAt: Date,
    servedAt: Date,       // when doctor started
    completedAt: Date,    // when done/skipped
    actualDurationMinutes: Number,

    // QR check-in
    qrToken: { type: String, unique: true, sparse: true },
    // Short numeric verification code shown to patient and doctor for in-person verification
    verificationCode: { type: String },

    // Notes (brief pre-consultation reason)
    patientNotes: String,

    // Cancellation
    cancelledBy: { type: String, enum: ['patient', 'doctor', 'admin', 'system'] },
    cancellationReason: String,

    // Follow-up linkage
    followUpFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // No-show prediction score (0-1, set at booking time)
    noShowPrediction: { type: Number, default: 0 },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ doctorId: 1, date: 1, queueNumber: 1 }, { unique: true });

// Virtual: is today
appointmentSchema.virtual('isToday').get(function () {
  const today = new Date();
  const d = new Date(this.date);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
});

appointmentSchema.virtual('hospitalId').get(function () {
  return { _id: 'default-hospital', name: 'MediQueue Hospital', address: 'Main Branch' };
});

module.exports = mongoose.model('Appointment', appointmentSchema);
