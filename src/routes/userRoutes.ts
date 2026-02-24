import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new UserController();

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.getOne.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));
router.put('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

export default router;
