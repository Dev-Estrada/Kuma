import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new AuthController();

router.post('/login', ctrl.login.bind(ctrl));
router.get('/me', authMiddleware, ctrl.me.bind(ctrl));

export default router;
