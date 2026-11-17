import express from 'express';
import { sendMessage, getConversationSummary } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', sendMessage);
router.get('/summary/:ticketId', getConversationSummary);

export default router;
