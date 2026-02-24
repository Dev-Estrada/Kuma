import { Request, Response } from 'express';
import { ClientService } from '../services/clientService';

const service = new ClientService();

export class ClientController {
  async list(req: Request, res: Response) {
    try {
      const items = await service.list();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Error al listar clientes' });
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
      if (!item) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener el cliente' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const id = await service.create(req.body);
      res.status(201).json({ id });
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
      res.status(500).json({ error: 'Error al eliminar' });
    }
  }
}
