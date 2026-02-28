import { Router } from 'express';
import multer from 'multer';
import { SettingsController } from '../controllers/settingsController';

const router = Router();
const ctrl = new SettingsController();

const uploadBranding = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpeg|jpg|webp|svg\+xml)$/.test(file.mimetype || '');
    cb(null, !!ok);
  },
}).single('logo');

router.get('/exchange-rate', ctrl.getExchangeRate.bind(ctrl));
router.put('/exchange-rate', ctrl.setExchangeRate.bind(ctrl));
router.get('/exchange-rate-history', ctrl.getExchangeRateHistory.bind(ctrl));
router.get('/last-rate-update', ctrl.lastRateUpdate.bind(ctrl));
router.get('/branding-logo', ctrl.getBrandingLogo.bind(ctrl));
router.post('/branding-logo', (req, res, next) => {
  uploadBranding(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Archivo no válido o demasiado grande (máx. 10 MB).' });
    next();
  });
}, ctrl.uploadBrandingLogo.bind(ctrl));
router.delete('/branding-logo', ctrl.removeBrandingLogo.bind(ctrl));

export default router;