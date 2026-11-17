import express from 'express';
import { getDashboardMetrics, exportReportCSV } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize('admin', 'supervisor', 'agent'), getDashboardMetrics);
router.get('/export-csv', authorize('admin', 'supervisor'), exportReportCSV);

export default router;
