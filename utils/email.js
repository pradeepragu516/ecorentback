const nodemailer = require('nodemailer');

const createTransporter = async () => {
  // If SMTP configurations exist in process.env, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback: Test account using Ethereal Mail
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    // If ethereal offline, return null to trigger log simulation
    return null;
  }
};

const sendEmail = async (options) => {
  console.log('--- 📧 EMAIL SYSTEM SENDING ---');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  
  const transporter = await createTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: '"EcoRent Support" <support@ecorent.com>',
        to: options.to,
        subject: options.subject,
        text: options.text || options.message,
        html: options.html
      });
      console.log('Message sent: %s', info.messageId);
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log('Preview URL: %s', testUrl);
      }
      return info;
    } catch (err) {
      console.error('Nodemailer send error, logging text fallback:', err.message);
    }
  }

  // Local fallback log if no transporter is available or error occurs
  console.log(`Message Body: ${options.message || options.text}`);
  console.log('---------------------------------');
  return new Promise((resolve) => setTimeout(resolve, 100));
};

const sendBookingConfirmation = async (userEmail, rentalDetails) => {
  const text = `
    Hi ${rentalDetails.userName},
    
    Your booking for ${rentalDetails.vehicleName} is confirmed!
    
    Pickup: ${rentalDetails.startDate} at ${rentalDetails.pickupLocation}
    Return: ${rentalDetails.endDate} at ${rentalDetails.returnLocation}
    Total Paid: $${rentalDetails.totalPaid}
    
    Thank you for choosing EcoRent!
    Drive the future today.
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Booking Confirmed! ✅</h2>
      <p>Hi <strong>${rentalDetails.userName}</strong>,</p>
      <p>Your booking for <strong>${rentalDetails.vehicleName}</strong> is confirmed. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f9f9f9;"><td style="padding: 8px; font-weight: bold;">Pickup</td><td style="padding: 8px;">${rentalDetails.startDate} at ${rentalDetails.pickupLocation}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Return</td><td style="padding: 8px;">${rentalDetails.endDate} at ${rentalDetails.returnLocation}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="padding: 8px; font-weight: bold;">Total Paid</td><td style="padding: 8px; color: #4CAF50; font-weight: bold;">$${rentalDetails.totalPaid}</td></tr>
      </table>
      <p>Thank you for choosing <strong>EcoRent</strong>! Let's drive towards a greener future.</p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'EcoRent - Booking Confirmed ✅',
    text,
    html
  });
};

module.exports = {
  sendEmail,
  sendBookingConfirmation
};
