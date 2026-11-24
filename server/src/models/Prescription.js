const mongoose = require('mongoose');

const extractedMedicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    strength: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.9,
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    clinicName: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    rawOcrText: {
      type: String,
      trim: true,
    },
    extractedMedicines: [extractedMedicineSchema],
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
