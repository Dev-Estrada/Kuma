import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { adminOnly } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new BackupController();

router.get('/', adminOnly, ctrl.download.bind(ctrl));
router.post('/restore', adminOnly, ctrl.restore.bind(ctrl));
router.post('/restore-demo', adminOnly, ctrl.restoreDemo.bind(ctrl));
router.post('/delete-database', adminOnly, ctrl.deleteDatabase.bind(ctrl));

export default router;
