import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const DB_FILENAME = 'inventory.db';
const DB_RESTORE = 'inventory.db.restore';

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

  /** Restaurar: recibe JSON { data: base64 }. Escribe a inventory.db.restore; al reiniciar el servidor se aplica. */
  async restore(req: Request, res: Response) {
    try {
      const data = req.body?.data;
      if (typeof data !== 'string' || !data) {
        return res.status(400).json({ error: 'Se requiere body JSON con campo "data" (contenido del archivo en base64)' });
      }
      const buf = Buffer.from(data, 'base64');
      if (buf.length < 100) {
        return res.status(400).json({ error: 'El archivo parece inválido (muy pequeño)' });
      }
      const restorePath = path.resolve(process.cwd(), DB_RESTORE);
      fs.writeFileSync(restorePath, buf);
      res.json({ ok: true, message: 'Archivo guardado. Reinicie el servidor para completar la restauración.' });
    } catch (err) {
      res.status(500).json({ error: 'Error al guardar el archivo de restauración' });
    }
  }
}
