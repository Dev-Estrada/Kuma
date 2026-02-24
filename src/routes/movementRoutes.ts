import { Router } from 'express';
import { MovementController } from '../controllers/movementController';

const router = Router();
const ctrl = new MovementController();

router.get('/', ctrl.getAll.bind(ctrl));
router.get('/product/:productId', ctrl.byProduct.bind(ctrl));
router.post('/adjustment', ctrl.adjustment.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));

export default router;
