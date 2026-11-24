/**
 * Quick Sanjeevani - Order Routes
 * Handles medicine ordering, neighborhood pharmacy assignment, Razorpay UPI payment links,
 * and order status lifecycle.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { Order, Medicine, Pharmacy } = require('../models');
const { getConnectionStatus } = require('../config/db');

// In-memory fallback cache for test / degraded mode
const memoryOrders = [];

/**
 * Generate simulated Razorpay Payment Link
 */
function generateRazorpayPaymentLink(orderNumber, amount) {
  const linkId = `plink_${Math.random().toString(36).substring(2, 10)}`;
  return {
    paymentLinkId: linkId,
    paymentUrl: `https://rzp.io/l/qs_${orderNumber.toLowerCase()}`,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=quicksanjeevani@razorpay&pn=QuickSanjeevani&am=${amount}&tr=${orderNumber}`,
  };
}

/**
 * POST /api/orders
 * Create a new medicine order (from Mobile App, WhatsApp bot, or Web)
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      customerPhone,
      customerName = 'Elder Patient',
      items = [],
      deliveryAddress = {},
      source = 'whatsapp',
      prescriptionId = null,
    } = req.body;

    if (!customerPhone) {
      return res.status(400).json({
        type: 'https://quicksanjeevani.in/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'customerPhone is required to place an order',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        type: 'https://quicksanjeevani.in/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Order must contain at least one medicine item',
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const formattedItems = items.map((item) => {
      const unitPrice = Number(item.unitPrice || item.price || 45);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;
      return {
        medicineName: item.medicineName || item.name || 'Medicine',
        dosage: item.dosage || '',
        quantity,
        unitPrice,
        subtotal,
      };
    });

    const orderNumber = `QS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const paymentDetails = generateRazorpayPaymentLink(orderNumber, totalAmount);

    const orderPayload = {
      orderNumber,
      customerPhone,
      customerName,
      items: formattedItems,
      totalAmount,
      pharmacyName: 'City Chemist & Druggist (Yelahanka)',
      deliveryAddress: {
        street: deliveryAddress.street || 'Yelahanka New Town',
        city: deliveryAddress.city || 'Bengaluru',
        pincode: deliveryAddress.pincode || '560064',
        notes: deliveryAddress.notes || 'Elderly patient - please ring bell patiently',
      },
      prescription: prescriptionId,
      payment: {
        status: 'link_generated',
        method: 'upi',
        paymentLinkId: paymentDetails.paymentLinkId,
        paymentUrl: paymentDetails.paymentUrl,
      },
      fulfillmentStatus: 'placed',
      estimatedDeliveryMinutes: 30,
      source,
      createdAt: new Date().toISOString(),
    };

    const dbStatus = getConnectionStatus();
    if (dbStatus.status === 'connected') {
      try {
        const created = await Order.create(orderPayload);
        return res.status(201).json({
          status: 'success',
          order: created,
          payment: paymentDetails,
        });
      } catch (err) {
        // Degrade gracefully to memory store
        memoryOrders.unshift(orderPayload);
        return res.status(201).json({
          status: 'success',
          degraded: true,
          order: orderPayload,
          payment: paymentDetails,
        });
      }
    } else {
      memoryOrders.unshift(orderPayload);
      return res.status(201).json({
        status: 'success',
        degraded: true,
        order: orderPayload,
        payment: paymentDetails,
      });
    }
  })
);

/**
 * GET /api/orders
 * List orders with optional filters (phone, status)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { phone, status } = req.query;
    const dbStatus = getConnectionStatus();

    if (dbStatus.status === 'connected') {
      try {
        const filter = {};
        if (phone) filter.customerPhone = phone;
        if (status) filter.fulfillmentStatus = status;

        const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50);
        return res.json({
          status: 'success',
          count: orders.length,
          orders,
        });
      } catch (err) {
        // Fallback
      }
    }

    let result = [...memoryOrders];
    if (phone) result = result.filter((o) => o.customerPhone === phone);
    if (status) result = result.filter((o) => o.fulfillmentStatus === status);

    return res.json({
      status: 'success',
      degraded: true,
      count: result.length,
      orders: result,
    });
  })
);

/**
 * GET /api/orders/:id
 * Retrieve single order details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dbStatus = getConnectionStatus();

    if (dbStatus.status === 'connected') {
      try {
        const order = id.startsWith('QS-')
          ? await Order.findOne({ orderNumber: id })
          : await Order.findById(id);

        if (order) {
          return res.json({ status: 'success', order });
        }
      } catch (err) {
        // Fallback
      }
    }

    const found = memoryOrders.find((o) => o.orderNumber === id || o._id === id);
    if (found) {
      return res.json({ status: 'success', order: found });
    }

    return res.status(404).json({
      type: 'https://quicksanjeevani.in/errors/not-found',
      title: 'Order Not Found',
      status: 404,
      detail: `No order found with identifier ${id}`,
    });
  })
);

/**
 * POST /api/orders/:id/pay
 * Mock or webhook payment confirmation
 */
router.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paymentId = `pay_${Date.now()}` } = req.body;
    const dbStatus = getConnectionStatus();

    const updates = {
      'payment.status': 'paid',
      'payment.paidAt': new Date(),
      'payment.razorpayPaymentId': paymentId,
      fulfillmentStatus: 'packing',
    };

    if (dbStatus.status === 'connected') {
      try {
        const query = id.startsWith('QS-') ? { orderNumber: id } : { _id: id };
        const updated = await Order.findOneAndUpdate(query, updates, { new: true });
        if (updated) {
          return res.json({ status: 'success', order: updated });
        }
      } catch (err) {
        // Fallback
      }
    }

    const memOrder = memoryOrders.find((o) => o.orderNumber === id || o._id === id);
    if (memOrder) {
      memOrder.payment.status = 'paid';
      memOrder.payment.paidAt = new Date().toISOString();
      memOrder.fulfillmentStatus = 'packing';
      return res.json({ status: 'success', order: memOrder });
    }

    return res.status(404).json({
      type: 'https://quicksanjeevani.in/errors/not-found',
      title: 'Order Not Found',
      status: 404,
      detail: `No order found with identifier ${id}`,
    });
  })
);

/**
 * PATCH /api/orders/:id/status
 * Update fulfillment status (by pharmacist or delivery partner)
 */
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['placed', 'verified_by_pharmacist', 'packing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        type: 'https://quicksanjeevani.in/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: `Status must be one of: ${allowed.join(', ')}`,
      });
    }

    const dbStatus = getConnectionStatus();
    if (dbStatus.status === 'connected') {
      try {
        const query = id.startsWith('QS-') ? { orderNumber: id } : { _id: id };
        const updated = await Order.findOneAndUpdate(query, { fulfillmentStatus: status }, { new: true });
        if (updated) {
          return res.json({ status: 'success', order: updated });
        }
      } catch (err) {
        // Fallback
      }
    }

    const memOrder = memoryOrders.find((o) => o.orderNumber === id || o._id === id);
    if (memOrder) {
      memOrder.fulfillmentStatus = status;
      return res.json({ status: 'success', order: memOrder });
    }

    return res.status(404).json({
      type: 'https://quicksanjeevani.in/errors/not-found',
      title: 'Order Not Found',
      status: 404,
      detail: `No order found with identifier ${id}`,
    });
  })
);

module.exports = router;
