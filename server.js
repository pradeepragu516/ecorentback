require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const rentalRoutes = require('./routes/rental.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const loyaltyRoutes = require('./routes/loyalty.routes');
const messageRoutes = require('./routes/message.routes');
const settingsRoutes = require('./routes/settings.routes');
const userRoutes = require('./routes/user.routes');

// Middleware & Security Imports
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, mongoSanitize, xssSanitize } = require('./middleware/security');
const rentalService = require('./services/rental.service');

const app = express();

// Security Headers & CORS
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Common React ports
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection
let isDbConnected = false;
mongoose.set('bufferCommands', false); // Disable buffering for all models
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 3000,
  family: 4 // Force IPv4
})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    isDbConnected = true;
    runSyncRunner();
  })
  .catch(err => {
    console.error('MongoDB connection error. Falling back to local data store.');
    console.error('DB_ERROR:', err.message);
    isDbConnected = false;
    runSyncRunner();
  });

// Make connection status available to routes
app.use((req, res, next) => {
  req.isDbConnected = isDbConnected;
  next();
});

// Apply Global Sanitization Middlewares
app.use(mongoSanitize);
app.use(xssSanitize);

// Apply Global Rate Limiting on API endpoints
app.use('/api', apiLimiter);

// Specific Auth Limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Route Middleware Registration
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

// Background Status Synchronizer Runner
function runSyncRunner() {
  // Run once immediately on launch
  rentalService.syncAllVehicleStatuses(isDbConnected)
    .then(() => console.log('Initial vehicle status sync completed.'))
    .catch(err => console.error('Status sync error:', err.message));

  // Recurring cron-like background job (runs every 5 minutes)
  setInterval(() => {
    rentalService.syncAllVehicleStatuses(isDbConnected)
      .then(() => console.log('Recurring vehicle status sync completed.'))
      .catch(err => console.error('Recurring status sync error:', err.message));
  }, 5 * 60 * 1000);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [1.1.0]`);
});
