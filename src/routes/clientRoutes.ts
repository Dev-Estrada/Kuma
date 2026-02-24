import { Router } from 'express';
import { ClientController } from '../controllers/clientController';

const router = Router();
const ctrl = new ClientController();

router.get('/', ctrl.list.bind(ctrl));
router.get('/search', ctrl.search.bind(ctrl));
router.get('/:id', ctrl.getOne.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));
router.put('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

export default router;
