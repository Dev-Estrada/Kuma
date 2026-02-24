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

export interface ProfitPeriodRow extends SalesPeriodRow {
  totalCostUsd: number;
  profitUsd: number;
  marginPercent: number;
}

export interface TopProductRow {
  productId: number;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalUsd: number;
  totalCostUsd?: number;
  profitUsd?: number;
  marginPercent?: number;
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
       FROM sales WHERE status = 'completada' AND createdAt >= ? AND createdAt <= ?`,
      from,
      to
    );
    return row || { totalUsd: 0, totalBs: 0, count: 0 };
  }

  async getProfitByDateRange(fromDate: string, toDate: string): Promise<ProfitPeriodRow> {
    const db = await getDb();
    const from = `${fromDate} 00:00:00`;
    const to = `${toDate} 23:59:59`;
    const summary = await db.get<{ totalUsd: number; totalBs: number; count: number }>(
      `SELECT COALESCE(SUM(s.totalUsd), 0) AS totalUsd, COALESCE(SUM(s.totalBs), 0) AS totalBs, COUNT(DISTINCT s.id) AS count
       FROM sales s
       WHERE s.status = 'completada' AND s.createdAt >= ? AND s.createdAt <= ?`,
      from,
      to
    );
    const costRow = await db.get<{ totalCostUsd: number }>(
      `SELECT COALESCE(SUM(si.quantity * p.costPrice), 0) AS totalCostUsd
       FROM sale_items si
       JOIN sales s ON s.id = si.saleId
       JOIN products p ON p.id = si.productId
       WHERE s.status = 'completada' AND s.createdAt >= ? AND s.createdAt <= ?`,
      from,
      to
    );
    const totalUsd = summary?.totalUsd ?? 0;
    const totalBs = summary?.totalBs ?? 0;
    const count = summary?.count ?? 0;
    const totalCostUsd = costRow?.totalCostUsd ?? 0;
    const profitUsd = totalUsd - totalCostUsd;
    const marginPercent = totalUsd > 0 ? (profitUsd / totalUsd) * 100 : 0;
    return { totalUsd, totalBs, count, totalCostUsd, profitUsd, marginPercent };
  }

  async getTopProducts(limit = 20): Promise<TopProductRow[]> {
    const db = await getDb();
    const rows = await db.all<(TopProductRow & { totalCostUsd: number })[]>(
      `SELECT si.productId, p.name AS productName, p.sku AS productSku,
              SUM(si.quantity) AS totalQuantity,
              SUM(si.subtotalUsd) AS totalUsd,
              SUM(si.quantity * COALESCE(p.costPrice, 0)) AS totalCostUsd
       FROM sale_items si
       JOIN products p ON p.id = si.productId
       JOIN sales s ON s.id = si.saleId AND s.status = 'completada'
       GROUP BY si.productId
       ORDER BY totalQuantity DESC
       LIMIT ?`,
      limit
    );
    return rows.map((r) => {
      const totalUsd = r.totalUsd ?? 0;
      const totalCostUsd = r.totalCostUsd ?? 0;
      const profitUsd = totalUsd - totalCostUsd;
      const marginPercent = totalUsd > 0 ? (profitUsd / totalUsd) * 100 : 0;
      return {
        productId: r.productId,
        productName: r.productName,
        productSku: r.productSku,
        totalQuantity: r.totalQuantity,
        totalUsd: r.totalUsd,
        totalCostUsd,
        profitUsd,
        marginPercent,
      };
    });
  }
}
