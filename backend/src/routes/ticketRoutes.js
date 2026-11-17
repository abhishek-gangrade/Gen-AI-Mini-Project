import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  escalateTicket,
  overrideAIAnalysis
} from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/:id')
  .get(getTicketById)
  .patch(authorize('admin', 'supervisor', 'agent'), updateTicket);

router.post('/:id/escalate', authorize('admin', 'supervisor', 'agent'), escalateTicket);
router.patch('/:id/override-analysis', authorize('admin', 'supervisor', 'agent'), overrideAIAnalysis);

export default router;
