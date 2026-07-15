const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Rental = require('../models/Rental');
const dbHandler = require('../data/dbHandler');
const loyaltyService = require('./loyalty.service');
const notificationService = require('./notification.service');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret456'
});

class PaymentService {
  isMockEnabled() {
    return !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('mockKeyId');
  }

  async createOrder(isDbConnected, userId, bookingId, amount) {
    const isMock = this.isMockEnabled();
    let orderId;
    
    if (isMock) {
      orderId = `order_mock_${Date.now()}`;
    } else {
      try {
        const options = {
          amount: Math.round(amount * 100), // amount in paisa for Razorpay
          currency: 'USD', // Support USD or INR depending on setup
          receipt: `receipt_${bookingId}`
        };
        const order = await razorpay.orders.create(options);
        orderId = order.id;
      } catch (err) {
        console.error('Razorpay Order Creation Error, falling back to mock:', err.message);
        orderId = `order_mock_${Date.now()}`;
      }
    }

    // Save Pending Payment details in DB
    let payment;
    if (isDbConnected) {
      payment = await Payment.create({
        user: userId,
        booking: bookingId,
        amount,
        paymentMethod: 'Razorpay',
        razorpayOrderId: orderId,
        status: 'Pending'
      });
    } else {
      payment = dbHandler.insert('payments', {
        user: userId,
        booking: bookingId,
        amount,
        paymentMethod: 'Razorpay',
        razorpayOrderId: orderId,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
    }

    return { payment, isMock, razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123' };
  }

  async verifyPayment(isDbConnected, { userId, email, username }, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const isMock = this.isMockEnabled() || razorpayOrderId.startsWith('order_mock_');
    let isValid = false;

    if (isMock) {
      isValid = true;
    } else {
      try {
        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        isValid = generatedSignature === razorpaySignature;
      } catch (err) {
        console.error('Razorpay signature verification failed:', err.message);
        isValid = false;
      }
    }

    if (!isValid) {
      // Update Payment status to Failed
      if (isDbConnected) {
        await Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'Failed' });
      } else {
        const pay = dbHandler.findOne('payments', { razorpayOrderId });
        if (pay) {
          dbHandler.update('payments', pay._id || pay.id, { status: 'Failed' });
        }
      }
      throw new Error('Payment signature verification failed');
    }

    // Payment is valid! Update Payment and Booking status
    let payment;
    let booking;

    if (isDbConnected) {
      payment = await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { 
          status: 'Paid',
          razorpayPaymentId,
          razorpaySignature
        },
        { new: true }
      );

      if (payment) {
        // Update rental status and assign points
        booking = await Rental.findByIdAndUpdate(
          payment.booking,
          { status: 'upcoming' },
          { new: true }
        ).populate('vehicle');
      }
    } else {
      const pay = dbHandler.findOne('payments', { razorpayOrderId });
      if (pay) {
        payment = dbHandler.update('payments', pay._id || pay.id, {
          status: 'Paid',
          razorpayPaymentId,
          razorpaySignature
        });
        
        booking = dbHandler.update('bookings', payment.booking, { status: 'upcoming' });
        if (booking) {
          const vehicle = dbHandler.findById('vehicles', booking.vehicle);
          booking.vehicle = vehicle;
        }
      }
    }

    if (booking) {
      // Reward Points: Add 100 reward points for the completed payment booking
      await loyaltyService.addPoints(isDbConnected, userId, 100);

      // Send Payment Success notification & email
      await notificationService.sendPaymentSuccess(
        isDbConnected,
        email,
        username,
        userId,
        payment.amount,
        razorpayOrderId
      );
    }

    return { success: true, payment, booking };
  }

  async getTransactions(isDbConnected, userId) {
    if (isDbConnected) {
      return await Payment.find({ user: userId })
        .populate({
          path: 'booking',
          populate: { path: 'vehicle' }
        })
        .sort('-createdAt');
    } else {
      const payments = dbHandler.getCollection('payments').filter(p => p.user === userId);
      return payments.map(p => {
        const booking = dbHandler.findById('bookings', p.booking);
        if (booking) {
          booking.vehicle = dbHandler.findById('vehicles', booking.vehicle);
        }
        return { ...p, booking };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }
}

module.exports = new PaymentService();
