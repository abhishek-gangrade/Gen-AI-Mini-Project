import express from 'express';
import {
  generateDraftResponse,
  approveResponse,
  getKnowledgeGaps,
  classifyDirect
} from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/draft-response', authorize('admin', 'supervisor', 'agent'), generateDraftResponse);
router.post('/approve-response', authorize('admin', 'supervisor', 'agent'), approveResponse);
router.get('/knowledge-gaps', authorize('admin', 'supervisor'), getKnowledgeGaps);
router.post('/classify', classifyDirect);

export default router;
