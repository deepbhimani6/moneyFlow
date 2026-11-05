const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  resetProfile,
} = require('../controllers/profileController');

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/reset', resetProfile);

module.exports = router;
