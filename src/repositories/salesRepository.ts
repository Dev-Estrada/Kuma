import { getDb, runTransaction } from '../database';
import { Sale, SaleItem } from '../models/sale';
import { getVenezuelaNow } from '../utils/venezuelaTime';

interface ProductUpdate { id: number; newQuantity: number; previousQuantity: number }
interface MovementRow { productId: number; quantity: number; previousQuantity: number; newQuantity: number; notes: string }

export class SalesRepository {
  async createSale(
    sale: { totalUsd: number; totalBs: number; exchangeRate: number; discountPercent?: number; notes?: string; clientId?: number | null },
    items: { productId: number; quantity: number; unitPriceUsd: number; subtotalUsd: number }[],
    productUpdates: ProductUpdate[],
    movements: MovementRow[]
  ): Promise<number> {
    return runTransaction(async (db) => {
      const createdAt = getVenezuelaNow();
      const saleResult = await db.run(
        `INSERT INTO sales (totalUsd, totalBs, exchangeRate, discountPercent, notes, status, clientId, createdAt)
         VALUES (?, ?, ?, ?, ?, 'completada', ?, ?)`,
        sale.totalUsd,
        sale.totalBs,
        sale.exchangeRate,
        sale.discountPercent ?? 0,
        sale.notes ?? null,
        sale.clientId ?? null,
        createdAt
      );
      const saleId = saleResult.lastID!;
      for (const it of items) {
        await db.run(
          `INSERT INTO sale_items (saleId, productId, quantity, unitPriceUsd, subtotalUsd)
           VALUES (?, ?, ?, ?, ?)`,
          saleId,
          it.productId,
          it.quantity,
          it.unitPriceUsd,
          it.subtotalUsd
        );
      }
      for (const u of productUpdates) {
        await db.run('UPDATE products SET quantity = ? WHERE id = ?', u.newQuantity, u.id);
      }
      for (const m of movements) {
        await db.run(
          `INSERT INTO movements (productId, movementType, quantity, previousQuantity, newQuantity, referenceNumber, notes)
           VALUES (?, 'salida', ?, ?, ?, ?, ?)`,
          m.productId,
          m.quantity,
          m.previousQuantity,
          m.newQuantity,
          `Venta #${saleId}`,
          m.notes
        );
      }
      return saleId;
    });
  }

  async list(limit = 100): Promise<(Sale & { itemCount?: number; clientName?: string })[]> {
    const db = await getDb();
    const rows = await db.all<(Sale & { itemCount: number; clientName?: string })[]>(
      `SELECT s.*, c.name AS clientName, COUNT(si.id) AS itemCount
       FROM sales s
       LEFT JOIN clients c ON c.id = s.clientId
       LEFT JOIN sale_items si ON si.saleId = s.id
       GROUP BY s.id
       ORDER BY s.createdAt DESC
       LIMIT ?`,
      limit
    );
    return rows;
  }

  async listByDateRange(fromDate: string, toDate: string): Promise<(Sale & { itemCount?: number; clientName?: string })[]> {
    const db = await getDb();
    const from = `${fromDate} 00:00:00`;
    const to = `${toDate} 23:59:59`;
    return db.all<(Sale & { itemCount: number; clientName?: string })[]>(
      `SELECT s.*, c.name AS clientName, COUNT(si.id) AS itemCount
       FROM sales s
       LEFT JOIN clients c ON c.id = s.clientId
       LEFT JOIN sale_items si ON si.saleId = s.id
       WHERE s.createdAt >= ? AND s.createdAt <= ?
       GROUP BY s.id
       ORDER BY s.createdAt DESC`,
      from,
      to
    );
  }

  async getById(id: number): Promise<(Sale & { items: (SaleItem & { productName?: string; productSku?: string })[]; clientName?: string }) | null> {
    const db = await getDb();
    const sale = await db.get<Sale & { clientName?: string }>(
      `SELECT s.*, c.name AS clientName FROM sales s LEFT JOIN clients c ON c.id = s.clientId WHERE s.id = ?`,
      id
    );
    if (!sale) return null;
    const items = await db.all<(SaleItem & { productName: string; productSku: string })[]>(
      `SELECT si.*, p.name AS productName, p.sku AS productSku
       FROM sale_items si
       JOIN products p ON p.id = si.productId
       WHERE si.saleId = ?
       ORDER BY si.id`,
      id
    );
    return { ...sale, items };
  }

  async voidSale(id: number, reason?: string): Promise<void> {
    return runTransaction(async (db) => {
      const sale = await db.get<{ status: string }>('SELECT status FROM sales WHERE id = ?', id);
      if (!sale) throw new Error('Venta no encontrada');
      if (sale.status === 'anulada') throw new Error('La venta ya está anulada');
      const items = await db.all<{ productId: number; quantity: number }[]>(
        'SELECT productId, quantity FROM sale_items WHERE saleId = ?',
        id
      );
      const now = getVenezuelaNow();
      for (const it of items) {
        const row = await db.get<{ quantity: number }>('SELECT quantity FROM products WHERE id = ?', it.productId);
        if (row) {
          const prev = row.quantity;
          const newQty = prev + it.quantity;
          await db.run('UPDATE products SET quantity = ?, updatedAt = ? WHERE id = ?', newQty, now, it.productId);
          await db.run(
            `INSERT INTO movements (productId, movementType, quantity, previousQuantity, newQuantity, referenceNumber, notes, createdAt)
             VALUES (?, 'entrada', ?, ?, ?, ?, ?, ?)`,
            it.productId,
            it.quantity,
            prev,
            newQty,
            `Devolución Venta #${id}`,
            reason || `Devolución Venta #${id}`,
            now
          );
        }
      }
      await db.run(
        'UPDATE sales SET status = ?, voidedAt = ?, voidReason = ? WHERE id = ?',
        'anulada',
        now,
        reason || null,
        id
      );
    });
  }
}
