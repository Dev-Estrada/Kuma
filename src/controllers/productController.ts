import { Request, Response } from 'express';
import { ProductService } from '../services/productService';

const service = new ProductService();

export class ProductController {
  async getAll(req: Request, res: Response) {
    try {
      const items = await service.list();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener los productos' });
    }
  }

  async search(req: Request, res: Response) {
    const q = (req.query.q as string) || '';
    try {
      const items = await service.search(q);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error en búsqueda' });
    }
  }

  async getOne(req: Request, res: Response) {
    const id = Number(req.params.id);
    try {
      const item = await service.get(id);
      if (!item) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener el producto' });
    }
  }

  async getByBarcode(req: Request, res: Response) {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim() : '';
    if (!barcode) return res.status(400).json({ error: 'Se requiere barcode' });
    try {
      const item = await service.getByBarcode(barcode);
      if (!item) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener el producto' });
    }
  }

  /** Búsqueda unificada para POS: por ID, barcode, SKU o nombre */
  async posSearch(req: Request, res: Response) {
    const q = (req.query.q as string) || '';
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    try {
      const items = await service.posSearch(q.trim(), limit);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error en búsqueda' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newId = await service.create(req.body);
      res.status(201).json({ id: newId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    try {
      await service.update(id, req.body);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    try {
      await service.delete(id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }

  async lowStock(req: Request, res: Response) {
    try {
      const items = await service.lowStock();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener productos con poco stock' });
    }
  }

  async expiring(req: Request, res: Response) {
    const days = req.query.days ? Number(req.query.days) : 30;
    try {
      const items = await service.getExpiring(days);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener productos por vencer' });
    }
  }

  async exportCsv(req: Request, res: Response) {
    try {
      const csv = await service.exportCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="inventario.csv"');
      res.send('\uFEFF' + csv);
    } catch (err) {
      res.status(500).json({ error: 'Error al exportar inventario' });
    }
  }

  async setFavorite(req: Request, res: Response) {
    const id = Number(req.params.id);
    const isFavorite = req.body?.isFavorite === true;
    try {
      await service.setFavorite(id, isFavorite);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
