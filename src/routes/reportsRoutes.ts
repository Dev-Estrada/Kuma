import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';

const router = Router();
const ctrl = new ReportsController();

router.get('/inventory-value', ctrl.inventoryValue.bind(ctrl));
router.get('/sales-by-period', ctrl.salesByPeriod.bind(ctrl));
router.get('/top-products', ctrl.topProducts.bind(ctrl));
router.get('/day-summary', ctrl.daySummary.bind(ctrl));

export default router;
