import { Router } from 'express';
import { BackupController } from '../controllers/backupController';

const router = Router();
const ctrl = new BackupController();

router.get('/', ctrl.download.bind(ctrl));

export default router;
