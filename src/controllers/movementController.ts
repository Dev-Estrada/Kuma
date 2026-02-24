import { Request, Response } from 'express';
import { MovementService } from '../services/movementService';

const service = new MovementService();

export class MovementController {
  async getAll(req: Request, res: Response) {
    try {
      const moves = await service.list();
      res.json(moves);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener movimientos' });
    }
  }

  async byProduct(req: Request, res: Response) {
    const pid = Number(req.params.productId);
    try {
      const moves = await service.byProduct(pid);
      res.json(moves);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener movimientos del producto' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const id = await service.record(req.body);
      res.status(201).json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async adjustment(req: Request, res: Response) {
    const { productId, quantity, reason } = req.body || {};
    const pid = productId != null ? Number(productId) : NaN;
    const delta = quantity != null ? Number(quantity) : NaN;
    if (isNaN(pid) || isNaN(delta)) {
      return res.status(400).json({ error: 'Se requieren productId y quantity (número)' });
    }
    try {
      await service.recordAdjustment(pid, delta, typeof reason === 'string' ? reason : undefined);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
