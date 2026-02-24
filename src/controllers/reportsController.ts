import { Request, Response } from 'express';
import { ReportsService } from '../services/reportsService';

const service = new ReportsService();

export class ReportsController {
  async inventoryValue(req: Request, res: Response) {
    try {
      const data = await service.getInventoryValue();
      res.json(data || { totalCostValue: 0, totalListValue: 0, totalProducts: 0, totalUnits: 0 });
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener valor del inventario' });
    }
  }

  async salesByPeriod(req: Request, res: Response) {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) {
      return res.status(400).json({ error: 'Se requieren from y to (YYYY-MM-DD)' });
    }
    try {
      const data = await service.getSalesByDateRange(from, to);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener ventas del período' });
    }
  }

  async topProducts(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    try {
      const data = await service.getTopProducts(limit);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener productos más vendidos' });
    }
  }

  async daySummary(req: Request, res: Response) {
    try {
      const data = await service.getDaySummary();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener resumen del día' });
    }
  }

  async daySummaryWithProfit(req: Request, res: Response) {
    try {
      const data = await service.getDaySummaryWithProfit();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener resumen del día' });
    }
  }

  async profitByPeriod(req: Request, res: Response) {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) {
      return res.status(400).json({ error: 'Se requieren from y to (YYYY-MM-DD)' });
    }
    try {
      const data = await service.getProfitByDateRange(from, to);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener utilidad del período' });
    }
  }
}
