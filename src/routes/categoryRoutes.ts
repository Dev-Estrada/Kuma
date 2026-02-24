import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';

const router = Router();
const ctrl = new CategoryController();

router.get('/', ctrl.getAll.bind(ctrl));
router.get('/:id', ctrl.getOne.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));
router.put('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

export default router;
