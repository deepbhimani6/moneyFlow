const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  resetProfile,
} = require('../controllers/profileController');

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.post('/reset', protect, resetProfile);

module.exports = router;

