import { getDb } from '../database';
import { User } from '../models/user';

export class UserRepository {
  async getByUsername(username: string): Promise<(User & { passwordHash: string }) | null> {
    const db = await getDb();
    const row = await db.get<(User & { passwordHash: string })>(
      'SELECT id, username, passwordHash, displayName, role, isActive, createdAt FROM users WHERE username = ? AND isActive = 1',
      username.trim().toLowerCase()
    );
    return row || null;
  }

  async getById(id: number): Promise<User | null> {
    const db = await getDb();
    const row = await db.get<User>(
      'SELECT id, username, displayName, role, isActive, createdAt FROM users WHERE id = ?',
      id
    );
    return row || null;
  }

  async list(): Promise<User[]> {
    const db = await getDb();
    return db.all<User[]>(
      'SELECT id, username, displayName, role, isActive, createdAt FROM users ORDER BY username ASC'
    );
  }

  async create(username: string, passwordHash: string, displayName?: string, role: string = 'user'): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO users (username, passwordHash, displayName, role) VALUES (?, ?, ?, ?)',
      username.trim().toLowerCase(),
      passwordHash,
      displayName?.trim() || null,
      role
    );
    return result.lastID as number;
  }

  async update(id: number, data: { displayName?: string; passwordHash?: string; role?: string; isActive?: boolean }): Promise<void> {
    const db = await getDb();
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.displayName !== undefined) {
      updates.push('displayName = ?');
      values.push(data.displayName?.trim() || null);
    }
    if (data.passwordHash !== undefined) {
      updates.push('passwordHash = ?');
      values.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0) return;
    values.push(id);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);
  }

  async countAdmins(): Promise<number> {
    const db = await getDb();
    const row = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE role = ? AND isActive = 1', 'admin');
    return row?.c ?? 0;
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM users WHERE id = ?', id);
  }
}
