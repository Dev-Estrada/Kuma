import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getDataDir } from '../dataDir';
import { SettingsService } from '../services/settingsService';

const service = new SettingsService();

const BRANDING_BASENAME = 'custom-logo';

function getBrandingDir(): string {
  if (process.env.KUMA_DATA_DIR) {
    return path.join(getDataDir(), 'branding');
  }
  return path.join(__dirname, '../../public/assets/branding');
}

function ensureBrandingDir() {
  const dir = getBrandingDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getCurrentBrandingFile(): string | null {
  const dir = getBrandingDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const found = files.find((f) => f.startsWith(BRANDING_BASENAME));
  return found ? path.join(dir, found) : null;
}

function deleteBrandingFile() {
  const current = getCurrentBrandingFile();
  if (current) {
    try {
      fs.unlinkSync(current);
    } catch (_) {}
  }
}

export class SettingsController {
  async getExchangeRate(req: Request, res: Response) {
    try {
      const rate = await service.getExchangeRate();
      res.json({ exchangeRate: rate });
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener la tasa' });
    }
  }

  async setExchangeRate(req: Request, res: Response) {
    const rate = Number(req.body?.rate ?? req.body?.exchangeRate);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
    if (isNaN(rate)) {
      return res.status(400).json({ error: 'Tasa de Cambio inválida' });
    }
    try {
      await service.setExchangeRate(rate, notes);
      res.json({ ok: true, exchangeRate: rate });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getExchangeRateHistory(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    try {
      const history = await service.getExchangeRateHistory(limit);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener historial de tasa' });
    }
  }

  async lastRateUpdate(req: Request, res: Response) {
    try {
      const lastUpdate = await service.getLastRateUpdate();
      res.json({ lastUpdate });
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener última actualización de tasa' });
    }
  }

  /** Logo de fondo: devuelve la URL actual si existe. */
  async getBrandingLogo(req: Request, res: Response) {
    try {
      const current = getCurrentBrandingFile();
      if (!current) {
        return res.json({ url: null });
      }
      const basename = path.basename(current);
      res.json({ url: '/assets/branding/' + basename });
    } catch (_) {
      res.json({ url: null });
    }
  }

  /** Logo de fondo: subir imagen (se guarda en public/assets/branding/). */
  async uploadBrandingLogo(req: Request, res: Response) {
    const file = (req as any).file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'No se envió ningún archivo.' });
    }
    const ext = path.extname(file.originalname || '') || (file.mimetype ? '.' + file.mimetype.replace('image/', '') : '.png');
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext.toLowerCase()) ? ext : '.png';
    ensureBrandingDir();
    deleteBrandingFile();
    const newName = BRANDING_BASENAME + safeExt;
    const dest = path.join(getBrandingDir(), newName);
    try {
      fs.writeFileSync(dest, file.buffer);
    } catch (e) {
      return res.status(500).json({ error: 'Error al guardar el archivo.' });
    }
    res.json({ ok: true, url: '/assets/branding/' + newName });
  }

  /** Logo de fondo: quitar logo personalizado. */
  async removeBrandingLogo(req: Request, res: Response) {
    try {
      deleteBrandingFile();
      res.json({ ok: true });
    } catch (_) {
      res.status(500).json({ error: 'Error al eliminar.' });
    }
  }
}
