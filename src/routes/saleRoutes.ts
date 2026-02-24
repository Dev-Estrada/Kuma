import { Router } from 'express';
import { SaleController } from '../controllers/saleController';

const router = Router();
const ctrl = new SaleController();

router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.getOne.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));

export default router;
