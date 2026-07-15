const paymentService = require('../services/payment.service');
const Rental = require('../models/Rental');
const dbHandler = require('../data/dbHandler');

exports.createOrder = async (req, res, next) => {
  const { bookingId, amount } = req.body;

  try {
    const orderData = await paymentService.createOrder(
      req.isDbConnected,
      req.user.id,
      bookingId,
      amount
    );
    res.json({ success: true, data: orderData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error creating payment order' });
  }
};

exports.verifyPayment = async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    const verification = await paymentService.verifyPayment(
      req.isDbConnected,
      {
        userId: req.user.id,
        email: req.user.email,
        username: req.user.username
      },
      {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      }
    );
    res.json({ success: true, data: verification });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Payment verification failed' });
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const history = await paymentService.getTransactions(req.isDbConnected, req.user.id);
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving transaction history' });
  }
};

exports.downloadInvoice = async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    let rental;
    if (req.isDbConnected) {
      rental = await Rental.findById(bookingId).populate('vehicle').populate('user');
    } else {
      rental = dbHandler.findById('bookings', bookingId);
      if (rental) {
        rental.vehicle = dbHandler.findById('vehicles', rental.vehicle);
        rental.user = dbHandler.findById('users', rental.user);
      }
    }

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Generate responsive premium HTML invoice
    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>EcoRent Invoice - #${rental._id || rental.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); border-radius: 8px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #4CAF50; }
          .title { font-size: 24px; text-align: right; text-transform: uppercase; color: #555; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .details div { width: 48%; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px; }
          th { background-color: #f2f2f2; color: #555; font-weight: bold; padding: 12px; border-bottom: 1px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .total { font-size: 20px; font-weight: bold; color: #4CAF50; text-align: right; }
          .footer { text-align: center; font-size: 12px; color: #777; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          .print-btn { display: block; width: 120px; margin: 20px auto; padding: 10px; background-color: #4CAF50; color: white; text-align: center; text-decoration: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="logo">☘️ EcoRent</div>
            <div class="title">Invoice</div>
          </div>
          
          <div class="details">
            <div>
              <strong>Billed To:</strong><br>
              ${rental.user ? rental.user.username : 'Customer'}<br>
              ${rental.user ? rental.user.email : ''}<br>
              ${rental.user?.phone || ''}
            </div>
            <div style="text-align: right;">
              <strong>Invoice details:</strong><br>
              Invoice #: INV-${(rental._id || rental.id).toString().slice(-6).toUpperCase()}<br>
              Date: ${new Date().toLocaleDateString()}<br>
              Booking status: ${rental.status.toUpperCase()}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Vehicle Description</th>
                <th>Rental Interval</th>
                <th>Redeemed Discount</th>
                <th>Total Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${rental.vehicle ? rental.vehicle.name : 'Electric Vehicle'}</strong><br>Type: ${rental.vehicle ? rental.vehicle.type : 'N/A'}</td>
                <td>
                  Start: ${new Date(rental.startDate).toLocaleDateString()}<br>
                  End: ${new Date(rental.endDate).toLocaleDateString()}
                </td>
                <td>$${rental.discountAmount || 0}</td>
                <td><strong>$${rental.totalPaid}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total">
            Total Amount: $${rental.totalPaid}
          </div>

          <div class="footer">
            Thank you for choosing EcoRent. By driving an EV, you saved approx. ${(rental.distanceTraveled || 100) * 0.18} kg of CO2 emissions for this trip!<br>
            EcoRent Inc. | 123 Innovation Drive, Green Valley, CA 94043
          </div>
        </div>
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(invoiceHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error downloading invoice' });
  }
};
