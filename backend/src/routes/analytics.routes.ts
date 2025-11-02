import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();
const analyticsController = new AnalyticsController();

router.use(authMiddleware);
router.get('/stats', analyticsController.getUserStats);
router.get('/habits/:id', analyticsController.getHabitAnalytics);

export default router;
