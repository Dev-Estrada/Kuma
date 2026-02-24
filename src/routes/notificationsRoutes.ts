import { Router } from 'express';
import { NotificationsController } from '../controllers/notificationsController';

const router = Router();
const ctrl = new NotificationsController();

router.get('/', ctrl.list.bind(ctrl));

export default router;
