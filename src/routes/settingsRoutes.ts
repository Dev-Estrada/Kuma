import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';

const router = Router();
const ctrl = new SettingsController();

router.get('/exchange-rate', ctrl.getExchangeRate.bind(ctrl));
router.put('/exchange-rate', ctrl.setExchangeRate.bind(ctrl));
router.get('/exchange-rate-history', ctrl.getExchangeRateHistory.bind(ctrl));
router.get('/last-rate-update', ctrl.lastRateUpdate.bind(ctrl));

export default router;