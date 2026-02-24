import { Request, Response } from 'express';
import { CategoryService } from '../services/categoryService';

const service = new CategoryService();

export class CategoryController {
  async getAll(req: Request, res: Response) {
    try {
      const cats = await service.list();
      res.json(cats);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener categorías' });
    }
  }

  async getOne(req: Request, res: Response) {
    const id = Number(req.params.id);
    try {
      const cat = await service.get(id);
      if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
      res.json(cat);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener categoría' });
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
      res.status(500).json({ error: 'Error al eliminar categoría' });
    }
  }
}
