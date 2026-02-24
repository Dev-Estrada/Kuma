import { Router } from 'express';
import { BackupController } from '../controllers/backupController';

const router = Router();
const ctrl = new BackupController();

router.get('/', ctrl.download.bind(ctrl));
router.post('/restore', ctrl.restore.bind(ctrl));

export default router;
