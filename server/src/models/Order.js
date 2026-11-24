/**
 * Quick Sanjeevani - Order Model
 * Handles medication purchase orders, neighborhood pharmacy assignment,
 * Razorpay payment tracking, and elder-friendly fulfillment tracking.
 */

const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: false,
    },
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Elder Patient',
    },
    items: [OrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: false,
    },
    pharmacyName: {
      type: String,
      default: 'City Chemist & Druggist (Yelahanka)',
    },
    deliveryAddress: {
      street: { type: String, default: 'Yelahanka New Town' },
      city: { type: String, default: 'Bengaluru' },
      pincode: { type: String, default: '560064' },
      notes: { type: String, default: 'Elderly patient - please ring bell patiently' },
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      required: false,
    },
    payment: {
      status: {
        type: String,
        enum: ['pending', 'link_generated', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      method: {
        type: String,
        enum: ['upi', 'razorpay', 'cod', 'card'],
        default: 'upi',
      },
      paymentLinkId: {
        type: String,
        default: null,
      },
      paymentUrl: {
        type: String,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    fulfillmentStatus: {
      type: String,
      enum: ['placed', 'verified_by_pharmacist', 'packing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    estimatedDeliveryMinutes: {
      type: Number,
      default: 30,
    },
    source: {
      type: String,
      enum: ['whatsapp', 'mobile_app', 'web', 'voice_bot'],
      default: 'whatsapp',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
