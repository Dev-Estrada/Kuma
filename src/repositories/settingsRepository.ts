import { getDb } from '../database';
import { getVenezuelaNow } from '../utils/venezuelaTime';

const EXCHANGE_RATE_KEY = 'exchange_rate';

export interface ExchangeRateHistoryRow {
  id: number;
  rate: number;
  notes: string | null;
  createdAt: string;
}

export class SettingsRepository {
  async getExchangeRate(): Promise<number> {
    const db = await getDb();
    const row = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      EXCHANGE_RATE_KEY
    );
    if (!row) return 36.5;
    const n = parseFloat(row.value);
    return isNaN(n) || n <= 0 ? 36.5 : n;
  }

  async setExchangeRate(rate: number, notes?: string): Promise<void> {
    if (rate <= 0) throw new Error('La tasa debe ser mayor que cero');
    const db = await getDb();
    await db.run(
      `INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`,
      EXCHANGE_RATE_KEY,
      String(rate)
    );
    await db.run(
      'INSERT INTO exchange_rate_history (rate, notes, createdAt) VALUES (?, ?, ?)',
      rate,
      notes ?? null,
      getVenezuelaNow()
    );
  }

  async getExchangeRateHistory(limit = 100): Promise<ExchangeRateHistoryRow[]> {
    const db = await getDb();
    return db.all<ExchangeRateHistoryRow[]>(
      'SELECT id, rate, notes, createdAt FROM exchange_rate_history ORDER BY createdAt DESC LIMIT ?',
      limit
    );
  }

  async getLastRateUpdate(): Promise<string | null> {
    const db = await getDb();
    const row = await db.get<{ createdAt: string }>(
      'SELECT createdAt FROM exchange_rate_history ORDER BY createdAt DESC LIMIT 1'
    );
    return row?.createdAt ?? null;
  }
}
