/**
 * Copia de seguridad automática diaria a las 23:59 (hora Venezuela).
 * Mantiene como máximo 7 copias; elimina las más antiguas.
 */
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'inventory.db';
const BACKUPS_DIR = 'backups';
const MAX_BACKUPS = 7;

function getVenezuelaDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
}

function getDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let lastBackupDate: string | null = null;

function runDailyBackup(): void {
  const cwd = process.cwd();
  const dbPath = path.resolve(cwd, DB_FILENAME);
  if (!fs.existsSync(dbPath)) return;

  const dir = path.resolve(cwd, BACKUPS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const today = getDateStr(getVenezuelaDate());
  if (lastBackupDate === today) return;

  try {
    const destPath = path.join(dir, `inventory.${today}.db`);
    fs.copyFileSync(dbPath, destPath);
    lastBackupDate = today;

    const files = fs.readdirSync(dir)
      .filter((f) => f.startsWith('inventory.') && f.endsWith('.db'))
      .map((f) => ({ name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);

    while (files.length > MAX_BACKUPS) {
      const old = files.pop();
      if (old) {
        try {
          fs.unlinkSync(old.path);
        } catch (_) {}
      }
    }
  } catch (_) {
    // no loguear para no saturar; el backup es opcional
  }
}

export function startAutoBackupScheduler(): void {
  const CHECK_MS = 60 * 1000; // cada minuto

  setInterval(() => {
    const now = getVenezuelaDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour === 23 && minute >= 59) {
      runDailyBackup();
    }
  }, CHECK_MS);
}
