import { Router } from 'express';
import { HabitController } from '../controllers/habit.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { createHabitSchema, completeHabitSchema } from '../utils/validation.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();
const habitController = new HabitController();

router.use(authMiddleware);
router.post('/', validateRequest(createHabitSchema), habitController.createHabit);
router.get('/', habitController.getUserHabits);
router.get('/:id', habitController.getHabit);
router.put('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);
router.post('/:id/complete', validateRequest(completeHabitSchema), habitController.completeHabit);
router.delete('/:id/complete', habitController.uncompleteHabit);
router.get('/:id/history', habitController.getHabitHistory);

export default router;
