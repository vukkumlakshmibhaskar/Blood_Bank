const express = require('express');
const router = express.Router();
const { getConversations, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.get('/messages/:requestId', protect, getMessages);

module.exports = router;