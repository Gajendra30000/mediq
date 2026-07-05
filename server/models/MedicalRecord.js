const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  dosage: String,       // "500mg"
  frequency: String,    // "1-0-1" (morning-afternoon-night)
  duration: String,     // "7 days"
  route: String,        // "oral", "topical"
  instructions: String, // "take after food"
});

const medicalRecordSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    // Vitals recorded at visit
    vitals: {
      bloodPressure: String,   // "120/80"
      pulse: Number,           // bpm
      temperature: Number,     // °C
      weight: Number,          // kg
      height: Number,          // cm
      spO2: Number,            // %
      bloodSugar: Number,      // mg/dL
    },

    chiefComplaint: String,
    diagnosis: String,
    notes: String,             // doctor's consultation notes

    prescriptions: [prescriptionItemSchema],

    labTests: [String],        // ordered tests
    radiology: [String],       // X-ray, MRI etc.

    followUpDate: Date,
    followUpNotes: String,

    // Drug interaction check result (from AI service)
    drugInteractionWarnings: [String],

    // PDF generation
    pdfUrl: String,
    pdfGeneratedAt: Date,
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1, createdAt: -1 });

medicalRecordSchema.virtual('hospitalId').get(function () {
  return { _id: 'default-hospital', name: 'MediQueue Hospital' };
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
