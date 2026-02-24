import { getDb } from '../database';

export interface InventoryValueRow {
  totalCostValue: number;
  totalListValue: number;
  totalProducts: number;
  totalUnits: number;
}

export interface SalesPeriodRow {
  totalUsd: number;
  totalBs: number;
  count: number;
}

export interface TopProductRow {
  productId: number;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalUsd: number;
}

export class ReportsRepository {
  async getInventoryValue(): Promise<InventoryValueRow | null> {
    const db = await getDb();
    const row = await db.get<InventoryValueRow>('SELECT * FROM view_inventory_value');
    return row || null;
  }

  async getSalesByDateRange(fromDate: string, toDate: string): Promise<SalesPeriodRow> {
    const db = await getDb();
    const from = `${fromDate} 00:00:00`;
    const to = `${toDate} 23:59:59`;
    const row = await db.get<SalesPeriodRow>(
      `SELECT COALESCE(SUM(totalUsd), 0) AS totalUsd, COALESCE(SUM(totalBs), 0) AS totalBs, COUNT(*) AS count
       FROM sales WHERE createdAt >= ? AND createdAt <= ?`,
      from,
      to
    );
    return row || { totalUsd: 0, totalBs: 0, count: 0 };
  }

  async getTopProducts(limit = 20): Promise<TopProductRow[]> {
    const db = await getDb();
    return db.all<TopProductRow[]>(
      `SELECT si.productId, p.name AS productName, p.sku AS productSku,
              SUM(si.quantity) AS totalQuantity, SUM(si.subtotalUsd) AS totalUsd
       FROM sale_items si
       JOIN products p ON p.id = si.productId
       GROUP BY si.productId
       ORDER BY totalQuantity DESC
       LIMIT ?`,
      limit
    );
  }
}
