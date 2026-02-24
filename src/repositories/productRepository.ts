import { Product } from '../models/product';
import { getDb } from '../database';

export class ProductRepository {
  async getAll(): Promise<Product[]> {
    const db = await getDb();
    return db.all<Product[]>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id`
    );
  }

  async search(term: string): Promise<Product[]> {
    const db = await getDb();
    const like = `%${term}%`;
    return db.all<Product[]>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.name LIKE ? OR p.sku LIKE ?`,
      like,
      like
    );
  }

  async getById(id: number): Promise<Product | null> {
    const db = await getDb();
    const row = await db.get<Product>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.id = ?`,
      id
    );
    return row || null;
  }

  async getByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode || !barcode.trim()) return null;
    const db = await getDb();
    const row = await db.get<Product>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.barcode = ? AND p.isActive = 1`,
      barcode.trim()
    );
    return row || null;
  }

  /** Búsqueda unificada para POS: por ID, código de barras, SKU o nombre */
  async posSearch(term: string, limit = 50): Promise<Product[]> {
    if (!term || !term.trim()) return this.getAll();
    const db = await getDb();
    const t = term.trim();
    const like = `%${t}%`;
    const idNum = /^\d+$/.test(t) ? parseInt(t, 10) : -1;
    const rows = await db.all<Product[]>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.isActive = 1
         AND (p.id = ? OR p.barcode = ? OR p.sku LIKE ? OR p.name LIKE ?)
       ORDER BY p.isFavorite DESC, p.name ASC
       LIMIT ?`,
      idNum, t, like, like, limit
    );
    return rows;
  }

  async getByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    return db.all<Product[]>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.id IN (${placeholders})`,
      ...ids
    );
  }

  async create(prod: Product): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO products
       (sku, barcode, name, description, categoryId, brand, unitOfMeasure,
        quantity, minimumStock, maximumStock, costPrice, listPrice,
        supplierInfo, isActive, isFavorite, imageUrl, notes, expiryDate)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      prod.sku,
      prod.barcode || null,
      prod.name,
      prod.description || null,
      prod.categoryId || null,
      prod.brand || null,
      prod.unitOfMeasure || 'unidad',
      prod.quantity || 0,
      prod.minimumStock || 0,
      prod.maximumStock || null,
      prod.costPrice || 0,
      prod.listPrice || 0,
      prod.supplierInfo || null,
      prod.isActive !== undefined ? (prod.isActive ? 1 : 0) : 1,
      prod.isFavorite !== undefined ? (prod.isFavorite ? 1 : 0) : 0,
      prod.imageUrl || null,
      prod.notes || null,
      prod.expiryDate || null
    );
    return result.lastID as number;
  }

  async update(id: number, prod: Product): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE products SET
         sku=?, barcode=?, name=?, description=?, categoryId=?, brand=?,
         unitOfMeasure=?, quantity=?, minimumStock=?, maximumStock=?,
         costPrice=?, listPrice=?, supplierInfo=?, isActive=?, isFavorite=?,
         imageUrl=?, notes=?, expiryDate=?
       WHERE id = ?`,
      prod.sku,
      prod.barcode || null,
      prod.name,
      prod.description || null,
      prod.categoryId || null,
      prod.brand || null,
      prod.unitOfMeasure || 'unidad',
      prod.quantity ?? 0,
      prod.minimumStock ?? 0,
      prod.maximumStock || null,
      prod.costPrice ?? 0,
      prod.listPrice ?? 0,
      prod.supplierInfo || null,
      prod.isActive !== undefined ? (prod.isActive ? 1 : 0) : 1,
      prod.isFavorite !== undefined ? (prod.isFavorite ? 1 : 0) : 0,
      prod.imageUrl || null,
      prod.notes || null,
      prod.expiryDate || null,
      id
    );
  }

  async setFavorite(id: number, isFavorite: boolean): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE products SET isFavorite = ? WHERE id = ?', isFavorite ? 1 : 0, id);
  }

  async updateQuantity(id: number, newQuantity: number): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE products SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', newQuantity, id);
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM products WHERE id = ?', id);
  }

  async lowStock(): Promise<Product[]> {
    const db = await getDb();
    return db.all<Product[]>(
      `SELECT * FROM view_low_stock`
    );
  }

  async getExpiring(days = 30): Promise<Product[]> {
    const db = await getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return db.all<Product[]>(
      `SELECT p.*, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       WHERE p.isActive = 1 AND p.expiryDate IS NOT NULL AND p.expiryDate != ''
       AND date(p.expiryDate) <= date(?)
       ORDER BY p.expiryDate ASC`,
      cutoffStr
    );
  }
}
