import express from 'express';
import { getUsers, getAgents, updateUserRole } from '../controllers/teamController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/users', authorize('admin', 'supervisor'), getUsers);
router.get('/agents', getAgents);
router.patch('/users/:userId/role', authorize('admin'), updateUserRole);

export default router;
