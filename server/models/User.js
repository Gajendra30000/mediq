const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'reception'],
      default: 'patient',
    },

    // Patient-specific fields
    patient: {
      dob: Date,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      allergies: [String],
      chronicConditions: [String],
      emergencyContact: {
        name: String,
        phone: String,
        relation: String,
      },
    },

    fcmToken: String, // for push notifications
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    profilePhoto: String,
  },
  { timestamps: true }
);

// Hash password before save removed (moved to controller)

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.fcmToken;
  obj.hospitalId = { _id: 'default-hospital', name: 'MediQueue Hospital' };
  return obj;
};

module.exports = mongoose.model('User', userSchema);
