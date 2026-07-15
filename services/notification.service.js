const Notification = require('../models/Notification');
const dbHandler = require('../data/dbHandler');
const { sendEmail } = require('../utils/email');

class NotificationService {
  async createNotification(isDbConnected, { userId, title, message, type }) {
    let notification;
    if (isDbConnected) {
      notification = await Notification.create({
        user: userId,
        title,
        message,
        type: type || 'info'
      });
    } else {
      notification = dbHandler.insert('notifications', {
        user: userId,
        title,
        message,
        type: type || 'info',
        read: false,
        createdAt: new Date().toISOString()
      });
    }
    return notification;
  }

  async getUserNotifications(isDbConnected, userId) {
    if (isDbConnected) {
      return await Notification.find({ user: userId }).sort('-createdAt');
    } else {
      return dbHandler.getCollection('notifications')
        .filter(n => n.user === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  async markAsRead(isDbConnected, notificationId, userId) {
    if (isDbConnected) {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { read: true },
        { new: true }
      );
    } else {
      const notif = dbHandler.findById('notifications', notificationId);
      if (notif && notif.user === userId) {
        return dbHandler.update('notifications', notificationId, { read: true });
      }
      return null;
    }
  }

  async sendRegistrationSuccess(isDbConnected, userEmail, userName, userId) {
    const title = 'Welcome to EcoRent! 🎉';
    const message = `Welcome, ${userName}! Your registration is successful. Discover green mobility options on your dashboard.`;
    
    await this.createNotification(isDbConnected, {
      userId,
      title,
      message,
      type: 'success'
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Welcome to EcoRent, ${userName}!</h2>
        <p>Your account is created successfully. Thank you for joining us in building a sustainable future!</p>
        <a href="http://localhost:3000/login" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Dashboard</a>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: 'EcoRent - Registration Successful!',
      message,
      html
    });
  }

  async sendBookingConfirmed(isDbConnected, userEmail, userName, userId, rentalDetails) {
    const title = 'Booking Confirmed! 🚗';
    const message = `Your booking for ${rentalDetails.vehicleName} is confirmed for ${rentalDetails.startDate}.`;
    
    await this.createNotification(isDbConnected, {
      userId,
      title,
      message,
      type: 'success'
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Booking Confirmed! ✅</h2>
        <p>Hi ${userName},</p>
        <p>Your booking for <strong>${rentalDetails.vehicleName}</strong> is successful.</p>
        <p><strong>Pickup Location:</strong> ${rentalDetails.pickupLocation}</p>
        <p><strong>Start Date:</strong> ${rentalDetails.startDate}</p>
        <p><strong>Total Paid:</strong> $${rentalDetails.totalPaid}</p>
        <p>Enjoy your carbon-saving drive!</p>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: 'EcoRent - Booking Confirmed ✅',
      message,
      html
    });
  }

  async sendPaymentSuccess(isDbConnected, userEmail, userName, userId, amount, orderId) {
    const title = 'Payment Received! 💳';
    const message = `Payment of $${amount} was received successfully. Order ID: ${orderId}`;

    await this.createNotification(isDbConnected, {
      userId,
      title,
      message,
      type: 'success'
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Payment Success</h2>
        <p>Hi ${userName},</p>
        <p>We have successfully processed your payment of <strong>$${amount}</strong> for Order ID: ${orderId}.</p>
        <p>Thank you for your transaction.</p>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: 'EcoRent - Payment Successful 💳',
      message,
      html
    });
  }

  async sendRentalEndingSoon(isDbConnected, userEmail, userName, userId, vehicleName, timeString) {
    const title = 'Rental Ending Soon! ⏳';
    const message = `Your rental for ${vehicleName} ends soon (${timeString}). Please return the vehicle on time.`;

    await this.createNotification(isDbConnected, {
      userId,
      title,
      message,
      type: 'warning'
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #FF9800;">Rental Ending Soon</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that your rental for <strong>${vehicleName}</strong> is scheduled to end in <strong>${timeString}</strong>.</p>
        <p>Please make sure to return the vehicle to the designated pickup location on time to avoid penalties.</p>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: 'EcoRent - Rental Ending Soon ⏳',
      message,
      html
    });
  }

  async sendPasswordReset(isDbConnected, userEmail, userName, userId, resetUrl) {
    const title = 'Password Reset Request 🔑';
    const message = `You requested a password reset. Use this link: ${resetUrl}`;

    await this.createNotification(isDbConnected, {
      userId,
      title,
      message,
      type: 'warning'
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2>Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>You are receiving this email because you requested a password reset for your EcoRent account.</p>
        <p>Please click the button below to reset your password. This link is valid for 10 minutes.</p>
        <a href="${resetUrl}" style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: 'EcoRent - Password Reset Request 🔑',
      message,
      html
    });
  }
}

module.exports = new NotificationService();
