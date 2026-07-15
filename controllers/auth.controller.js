const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const dbHandler = require('../data/dbHandler');
const notificationService = require('../services/notification.service');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m' // Short-lived access token
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Longer refresh token
  });
};

const sendTokenResponse = async (isDbConnected, user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id || user.id);
  const refreshToken = generateRefreshToken(user._id || user.id);

  // Store refresh token in user profile
  if (isDbConnected) {
    await User.findByIdAndUpdate(user._id, { refreshToken });
  } else {
    dbHandler.update('users', user._id || user.id, { refreshToken });
  }

  // Configure cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token: accessToken,
    user: {
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
};

exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    let user;
    if (req.isDbConnected) {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      user = new User({ username, email, password });
      await user.save();
    } else {
      const existingUser = dbHandler.findOne('users', { email }) || dbHandler.findOne('users', { username });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      user = dbHandler.insert('users', { username, email, password, role: 'user', createdAt: new Date().toISOString() });
    }

    // Send Registration Success Email and Notification
    await notificationService.sendRegistrationSuccess(req.isDbConnected, user.email, user.username, user._id || user.id);

    await sendTokenResponse(req.isDbConnected, user, 201, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    let user;
    if (req.isDbConnected) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      user = dbHandler.findOne('users', { email });
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    await sendTokenResponse(req.isDbConnected, user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.refresh = async (req, res, next) => {
  // Try reading from cookie or body
  let token = req.cookies?.refreshToken || req.body.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token is missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;

    if (req.isDbConnected) {
      user = await User.findById(decoded.id);
    } else {
      user = dbHandler.findById('users', decoded.id);
    }

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Return new access token
    const newAccessToken = generateAccessToken(user._id || user.id);
    res.json({
      success: true,
      token: newAccessToken
    });
  } catch (err) {
    console.error('REFRESH_TOKEN_ERROR:', err.message);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res, next) => {
  let token = req.cookies?.refreshToken || req.body.refreshToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (req.isDbConnected) {
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      } else {
        dbHandler.update('users', decoded.id, { refreshToken: null });
      }
    } catch (err) {
      // Ignore token verification errors during logout
    }
  }

  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.getMe = async (req, res, next) => {
  res.json({ success: true, user: req.user });
};

exports.updateProfile = async (req, res, next) => {
  try {
    let user;
    if (req.isDbConnected) {
      user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.body.username) user.username = req.body.username;
      if (req.body.email) user.email = req.body.email;
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.address !== undefined) user.address = req.body.address;
      if (req.body.city !== undefined) user.city = req.body.city;
      if (req.body.zipCode !== undefined) user.zipCode = req.body.zipCode;
      if (req.body.country !== undefined) user.country = req.body.country;
      if (req.body.avatar !== undefined) user.avatar = req.body.avatar;

      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          zipCode: user.zipCode,
          country: user.country,
          avatar: user.avatar,
          role: user.role
        }
      });
    } else {
      user = dbHandler.update('users', req.user.id, req.body);
      res.json({ success: true, user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
};

exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (req.isDbConnected) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }

      user.password = newPassword;
      await user.save();
    } else {
      const user = dbHandler.findById('users', req.user.id);
      if (user.password !== currentPassword) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
      dbHandler.update('users', req.user.id, { password: newPassword });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during password update' });
  }
};

// Password Reset Flow (Forgot Password)
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    let user;
    if (req.isDbConnected) {
      user = await User.findOne({ email });
    } else {
      user = dbHandler.findOne('users', { email });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (req.isDbConnected) {
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpire = resetPasswordExpire;
      await user.save();
    } else {
      dbHandler.update('users', user._id || user.id, { resetPasswordToken, resetPasswordExpire });
    }

    // Send email reset link
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    await notificationService.sendPasswordReset(req.isDbConnected, user.email, user.username, user._id || user.id, resetUrl);

    res.json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during password reset request' });
  }
};

exports.resetPassword = async (req, res, next) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

  try {
    let user;
    if (req.isDbConnected) {
      user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
      }

      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    } else {
      user = dbHandler.findOne('users', { resetPasswordToken });
      if (!user || user.resetPasswordExpire < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
      }

      dbHandler.update('users', user._id || user.id, {
        password: req.body.password,
        resetPasswordToken: null,
        resetPasswordExpire: null
      });
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during password reset execution' });
  }
};
