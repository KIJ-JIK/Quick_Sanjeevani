const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['patient', 'elder', 'pharmacy_admin', 'admin'],
      default: 'patient',
    },
    preferredLanguage: {
      type: String,
      enum: ['hi', 'kn', 'en'],
      default: 'en',
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true },
    },
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true, default: 'Bengaluru' },
      pincode: { type: String, trim: true },
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
