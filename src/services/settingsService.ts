import { SettingsRepository } from '../repositories/settingsRepository';

export class SettingsService {
  private repo = new SettingsRepository();

  async getExchangeRate(): Promise<number> {
    return this.repo.getExchangeRate();
  }

  async setExchangeRate(rate: number, notes?: string): Promise<void> {
    if (rate <= 0) throw new Error('La tasa de cambio debe ser mayor que cero');
    if (rate > 1e6) throw new Error('La tasa de cambio no es válida');
    await this.repo.setExchangeRate(rate, notes);
  }

  async getExchangeRateHistory(limit?: number) {
    return this.repo.getExchangeRateHistory(limit ?? 100);
  }

  async getLastRateUpdate(): Promise<string | null> {
    return this.repo.getLastRateUpdate();
  }
}
