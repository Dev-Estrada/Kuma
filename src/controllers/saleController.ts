import { Request, Response } from 'express';
import { SaleService } from '../services/saleService';

const service = new SaleService();

export class SaleController {
  async create(req: Request, res: Response) {
    try {
      const result = await service.createSale(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async list(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    try {
      const sales = await service.list(limit);
      res.json(sales);
    } catch (err) {
      res.status(500).json({ error: 'Error al listar ventas' });
    }
  }

  async getOne(req: Request, res: Response) {
    const id = Number(req.params.id);
    try {
      const sale = await service.getById(id);
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
      res.json(sale);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener la venta' });
    }
  }
}
