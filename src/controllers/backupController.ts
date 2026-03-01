import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getDataDir } from '../dataDir';
import { deleteCurrentDatabase, applyRestoreNow } from '../database';

const DB_FILENAME = 'inventory.db';
const DB_RESTORE = 'inventory.db.restore';
const DEMO_DB_FILENAME = 'demoBD.db';
const BACKUPS_DIR = 'backups';

/** Formato: Inventario_del_sistema_FECHA_YYYY-MM-DD_HH-mm.db */
function backupFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `Inventario_del_sistema_FECHA_${y}-${m}-${day}_${h}-${min}.db`;
}

export class BackupController {
  /** Guarda una copia en la carpeta backups/ con nombre Inventario_del_sistema_FECHA_... */
  async saveToBackupsFolder(req: Request, res: Response) {
    try {
      const dataDir = getDataDir();
      const dbPath = path.resolve(dataDir, DB_FILENAME);
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: 'Base de datos no encontrada' });
      }
      const dir = path.resolve(dataDir, BACKUPS_DIR);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filename = backupFilename();
      const destPath = path.join(dir, filename);
      fs.copyFileSync(dbPath, destPath);
      res.json({ ok: true, filename, path: path.join(BACKUPS_DIR, filename), fullPath: path.resolve(destPath) });
    } catch (err) {
      res.status(500).json({ error: 'Error al guardar la copia de seguridad' });
    }
  }

  async download(req: Request, res: Response) {
    try {
      const dbPath = path.resolve(getDataDir(), DB_FILENAME);
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

  /** Restaurar: recibe JSON { data: base64 }. Aplica de inmediato sin reiniciar el servidor. */
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
      const restorePath = path.resolve(getDataDir(), DB_RESTORE);
      fs.writeFileSync(restorePath, buf);
      await applyRestoreNow();
      res.json({ ok: true, message: 'Restauración aplicada. Recargue la página para usar la nueva base de datos.' });
    } catch (err) {
      res.status(500).json({ error: 'Error al guardar el archivo de restauración' });
    }
  }

  /** Copia demoBD.db y aplica de inmediato; no hace falta reiniciar el servidor. */
  async restoreDemo(req: Request, res: Response) {
    try {
      const dataDir = getDataDir();
      let demoPath = path.resolve(dataDir, DEMO_DB_FILENAME);
      if (!fs.existsSync(demoPath)) {
        demoPath = path.resolve(__dirname, '..', '..', DEMO_DB_FILENAME);
      }
      if (!fs.existsSync(demoPath)) {
        return res.status(404).json({ error: 'No se encontró demoBD.db en la aplicación.' });
      }
      const restorePath = path.resolve(getDataDir(), DB_RESTORE);
      fs.copyFileSync(demoPath, restorePath);
      await applyRestoreNow();
      res.json({ ok: true, message: 'Base de datos de demostración aplicada. Recargue la página para usarla.' });
    } catch (err) {
      res.status(500).json({ error: 'Error al preparar la base de datos de demostración' });
    }
  }

  /** Cierra la conexión y elimina inventory.db. La próxima petición creará una BD nueva (vacía con admin por defecto). No hace falta reiniciar el servidor. */
  async deleteDatabase(req: Request, res: Response) {
    try {
      await deleteCurrentDatabase();
      res.json({ ok: true, message: 'Base de datos eliminada. Se creará una base de datos nueva. Si desea restaurar datos, use "Restaurar desde copia".' });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar la base de datos' });
    }
  }
}
