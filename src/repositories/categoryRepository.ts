import { Category } from '../models/category';
import { getDb } from '../database';

export class CategoryRepository {
  async getAll(): Promise<Category[]> {
    const db = await getDb();
    return db.all<Category[]>('SELECT * FROM categories');
  }

  async getById(id: number): Promise<Category | null> {
    const db = await getDb();
    const row = await db.get<Category>('SELECT * FROM categories WHERE id = ?', id);
    return row || null;
  }

  async getByName(name: string, excludeId?: number): Promise<Category | null> {
    const n = typeof name === 'string' ? name.trim() : '';
    if (!n) return null;
    const db = await getDb();
    const row = await db.get<Category>(
      'SELECT * FROM categories WHERE name = ? AND (? IS NULL OR id != ?)',
      n,
      excludeId ?? null,
      excludeId ?? null
    );
    return row || null;
  }

  async create(cat: Category): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO categories (name, description, isActive) VALUES (?, ?, ?)',
      cat.name,
      cat.description || null,
      cat.isActive !== undefined ? (cat.isActive ? 1 : 0) : 1
    );
    return result.lastID as number;
  }

  async update(id: number, cat: Category): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE categories SET name=?, description=?, isActive=? WHERE id = ?',
      cat.name,
      cat.description || null,
      cat.isActive !== undefined ? (cat.isActive ? 1 : 0) : 1,
      id
    );
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM categories WHERE id = ?', id);
  }
}
