import { getDb } from '../database';
import { Client } from '../models/client';

export class ClientRepository {
  async getAll(): Promise<Client[]> {
    const db = await getDb();
    return db.all<Client[]>('SELECT * FROM clients ORDER BY name ASC');
  }

  async getById(id: number): Promise<Client | null> {
    const db = await getDb();
    const row = await db.get<Client>('SELECT * FROM clients WHERE id = ?', id);
    return row || null;
  }

  /** Busca cliente por documento/cédula (solo si document no está vacío). excludeId para no chocar con el mismo en edición. */
  async getByDocument(document: string, excludeId?: number): Promise<Client | null> {
    const doc = typeof document === 'string' ? document.trim() : '';
    if (!doc) return null;
    const db = await getDb();
    const row = await db.get<Client>(
      'SELECT * FROM clients WHERE document = ? AND (? IS NULL OR id != ?)',
      doc,
      excludeId ?? null,
      excludeId ?? null
    );
    return row || null;
  }

  async search(term: string): Promise<Client[]> {
    if (!term.trim()) return this.getAll();
    const db = await getDb();
    const like = `%${term.trim()}%`;
    return db.all<Client[]>(
      'SELECT * FROM clients WHERE name LIKE ? OR document LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ? ORDER BY name ASC',
      like, like, like, like, like
    );
  }

  async create(client: Client): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO clients (name, document, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
      client.name,
      client.document || null,
      client.phone || null,
      client.email || null,
      client.address || null,
      client.notes || null
    );
    return result.lastID as number;
  }

  async update(id: number, client: Client): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE clients SET name = ?, document = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
      client.name,
      client.document || null,
      client.phone || null,
      client.email || null,
      client.address || null,
      client.notes || null,
      id
    );
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE sales SET clientId = NULL WHERE clientId = ?', id);
    await db.run('DELETE FROM clients WHERE id = ?', id);
  }
}
