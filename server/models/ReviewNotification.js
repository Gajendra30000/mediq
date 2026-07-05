const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true, // one review per appointment
    },

    doctorRating: { type: Number, min: 1, max: 5, required: true },
    hospitalRating: { type: Number, min: 1, max: 5, required: true },
    waitTimeRating: { type: Number, min: 1, max: 5 },

    comment: { type: String, maxlength: 1000 },
    tags: [String], // e.g. ['punctual', 'thorough', 'friendly']

    isAnonymous: { type: Boolean, default: false },

    // AI-generated summary (updated periodically)
    aiSummaryIncluded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ hospitalId: 1, createdAt: -1 });

// Auto-update doctor and hospital ratings after save
reviewSchema.post('save', async function () {
  const Doctor = mongoose.model('Doctor');
  const Hospital = mongoose.model('Hospital');

  // Update doctor rating
  const docStats = await mongoose.model('Review').aggregate([
    { $match: { doctorId: this.doctorId } },
    { $group: { _id: null, avg: { $avg: '$doctorRating' }, count: { $sum: 1 } } },
  ]);
  if (docStats.length) {
    await Doctor.findByIdAndUpdate(this.doctorId, {
      avgRating: Math.round(docStats[0].avg * 10) / 10,
      totalReviews: docStats[0].count,
    });
  }

  // Update hospital rating
  const hospStats = await mongoose.model('Review').aggregate([
    { $match: { hospitalId: this.hospitalId } },
    { $group: { _id: null, avg: { $avg: '$hospitalRating' }, count: { $sum: 1 } } },
  ]);
  if (hospStats.length) {
    await Hospital.findByIdAndUpdate(this.hospitalId, {
      avgRating: Math.round(hospStats[0].avg * 10) / 10,
      totalReviews: hospStats[0].count,
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    type: { type: String, enum: ['sms', 'push', 'in_app'], default: 'in_app' },
    event: {
      type: String,
      enum: [
        'appointment_booked',
        'appointment_confirmed',
        'checkin_reminder',
        'called_to_room',
        'doctor_delayed',
        'appointment_done',
        'appointment_cancelled',
        'followup_reminder',
        'review_request',
        'noshow_warning',
      ],
    },

    title: String,
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Review, Notification };
