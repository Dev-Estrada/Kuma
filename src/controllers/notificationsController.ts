import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { SettingsService } from '../services/settingsService';

const productService = new ProductService();
const settingsService = new SettingsService();

export class NotificationsController {
  async list(req: Request, res: Response) {
    try {
      const [lowStock, lastRateUpdate] = await Promise.all([
        productService.lowStock(),
        settingsService.getLastRateUpdate().catch(() => null),
      ]);
      const rateOutdated =
        lastRateUpdate == null ||
        (Date.now() - new Date(lastRateUpdate).getTime()) / (1000 * 60 * 60 * 24) > 7;
      res.json({
        rateOutdated: !!rateOutdated,
        lowStockCount: lowStock.length,
        items: [
          ...(rateOutdated
            ? [{ id: 'rate', type: 'warning', title: 'Tasa de cambio desactualizada', message: 'Hace más de 7 días que no actualizas la tasa USD → Bs.', link: 'settings.html', linkText: 'Ir a Configuración' }]
            : []),
          ...(lowStock.length > 0
            ? [{ id: 'lowstock', type: 'warning', title: 'Stock bajo', message: `${lowStock.length} producto(s) con stock por debajo del mínimo.`, link: 'inventory.html', linkText: 'Ver inventario' }]
            : []),
        ],
      });
    } catch (err) {
      res.status(500).json({ error: 'Error al cargar notificaciones' });
    }
  }
}
