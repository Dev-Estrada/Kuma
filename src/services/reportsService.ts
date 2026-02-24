import { ReportsRepository } from '../repositories/reportsRepository';
import { getVenezuelaNow } from '../utils/venezuelaTime';

export class ReportsService {
  private repo = new ReportsRepository();

  async getInventoryValue() {
    return this.repo.getInventoryValue();
  }

  async getSalesByDateRange(fromDate: string, toDate: string) {
    return this.repo.getSalesByDateRange(fromDate, toDate);
  }

  async getProfitByDateRange(fromDate: string, toDate: string) {
    return this.repo.getProfitByDateRange(fromDate, toDate);
  }

  async getTopProducts(limit?: number) {
    return this.repo.getTopProducts(limit ?? 20);
  }

  async getDaySummary() {
    const now = getVenezuelaNow();
    const today = now.slice(0, 10);
    return this.repo.getSalesByDateRange(today, today);
  }

  async getDaySummaryWithProfit() {
    const now = getVenezuelaNow();
    const today = now.slice(0, 10);
    return this.repo.getProfitByDateRange(today, today);
  }
}
