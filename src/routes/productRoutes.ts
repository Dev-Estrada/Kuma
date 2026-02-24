import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();
const ctrl = new ProductController();

router.get('/', ctrl.getAll.bind(ctrl));
router.get('/search', ctrl.search.bind(ctrl));
router.get('/low-stock', ctrl.lowStock.bind(ctrl));
router.get('/:id', ctrl.getOne.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));
router.put('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

export default router;
