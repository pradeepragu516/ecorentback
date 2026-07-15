const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting configurations
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth specific limiter (more restrictive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// XSS input sanitization middleware
const xssSanitize = (req, res, next) => {
  const clean = (val) => {
    if (typeof val === 'string') {
      // Strips <script> tags and inline event handlers like onload, onerror, onclick, etc.
      return val
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript\s*:\s*/gi, '');
    }
    if (typeof val === 'object' && val !== null) {
      for (const k in val) {
        val[k] = clean(val[k]);
      }
    }
    return val;
  };

  req.body = clean(req.body);
  req.query = clean(req.query);
  req.params = clean(req.params);
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  mongoSanitize: mongoSanitize(),
  xssSanitize
};
