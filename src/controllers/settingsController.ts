import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService';

const service = new SettingsService();

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
      return res.status(400).json({ error: 'Tasa de cambio inválida' });
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
}
