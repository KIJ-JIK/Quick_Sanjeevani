const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    medicineName: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    priceOverride: {
      type: Number,
      min: [0, 'Price override cannot be negative'],
    },
  },
  { _id: false }
);

const pharmacySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pharmacy name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Pharmacy phone number is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Drug license number is required'],
      trim: true,
      unique: true,
    },
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, default: 'Bengaluru', trim: true },
      pincode: { type: String, trim: true },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'GeoJSON coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 && // longitude
              val[1] >= -90 &&
              val[1] <= 90 // latitude
            );
          },
          message: 'Coordinates must be valid [longitude, latitude] array',
        },
      },
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 4.5,
    },
    openingHours: {
      type: String,
      default: '08:00 - 22:00',
      trim: true,
    },
    inventory: [inventoryItemSchema],
    stockFreshnessTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries ($near, $geoWithin)
pharmacySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
