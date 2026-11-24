const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Therapeutic category is required'],
      trim: true,
      index: true,
    },
    strength: {
      type: String,
      trim: true,
    },
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Cream', 'Inhaler', 'Drops', 'Powder', 'Gel', 'Suspension'],
      default: 'Tablet',
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    schedule: {
      type: String,
      enum: ['OTC', 'Schedule H', 'Schedule X', 'Schedule H1'],
      default: 'OTC',
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    sideEffects: [
      {
        type: String,
        trim: true,
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for fuzzy/full-text search across brand name, generic name, and category
medicineSchema.index({ name: 'text', genericName: 'text', category: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
