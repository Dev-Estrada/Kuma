import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const DB_FILENAME = 'inventory.db';

export class BackupController {
  async download(req: Request, res: Response) {
    try {
      const dbPath = path.resolve(process.cwd(), DB_FILENAME);
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: 'Base de datos no encontrada' });
      }
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${DB_FILENAME}"`);
      const stream = fs.createReadStream(dbPath);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: 'Error al generar copia de seguridad' });
    }
  }
}
