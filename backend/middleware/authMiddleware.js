const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const Profile = require('../models/Profile');

const JWT_SECRET = process.env.JWT_SECRET || 'moneyflow_super_secret_jwt_key_2026';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      let user = null;
      if (decoded.id) {
        user = await Member.findById(decoded.id).select('-password');
      }

      if (!user && decoded.email) {
        user = await Member.findOne({ email: decoded.email.toLowerCase() }).select('-password');
      }

      // Fallback check in Profile if member record isn't found
      if (!user) {
        const profile = await Profile.findOne();
        if (profile && (String(profile._id) === String(decoded.id) || profile.email === decoded.email)) {
          user = {
            _id: profile._id,
            fullName: profile.fullName,
            email: profile.email,
            username: profile.username,
            phoneNumber: profile.phoneNumber,
            bio: profile.bio,
            avatarColor: profile.avatarColor,
          };
        }
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found or session expired' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  return next();
};

module.exports = {
  protect,
  adminOnly,
  JWT_SECRET,
};
