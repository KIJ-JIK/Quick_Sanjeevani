/**
 * Quick Sanjeevani - Medical Document Model
 * Secure digital health locker for patient prescriptions, lab reports, and invoices.
 */

const mongoose = require('mongoose');

const MedicalDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['prescription', 'lab_report', 'vaccination', 'discharge_summary', 'invoice'],
      default: 'prescription',
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'application/pdf'],
      default: 'image/jpeg',
    },
    extractedEntities: {
      doctorName: { type: String, default: null },
      clinicName: { type: String, default: null },
      date: { type: Date, default: null },
      medicines: [{ type: String }],
    },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MedicalDocument', MedicalDocumentSchema);
