const express = require('express');
const router = express.Router();
const { createRequest, getMyRequests } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createRequest);
router.get('/my-requests', protect, getMyRequests);

module.exports = router;