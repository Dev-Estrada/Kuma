import { ProductRepository } from '../repositories/productRepository';
import { SettingsRepository } from '../repositories/settingsRepository';
import { SalesRepository } from '../repositories/salesRepository';
import { SaleCreateRequest } from '../models/sale';

export class SaleService {
  private productRepo = new ProductRepository();
  private settingsRepo = new SettingsRepository();
  private salesRepo = new SalesRepository();

  async createSale(req: SaleCreateRequest): Promise<{ id: number; totalUsd: number; totalBs: number }> {
    if (!req.items || req.items.length === 0) {
      throw new Error('Debe incluir al menos un producto en la venta');
    }
    const discountPercent = Math.max(0, Math.min(100, req.discountPercent ?? 0));
    const productIds = [...new Set(req.items.map((i) => i.productId))];
    const products = await this.productRepo.getByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id!, p]));

    const lineItems: { productId: number; quantity: number; unitPriceUsd: number; subtotalUsd: number }[] = [];
    const productUpdates: { id: number; newQuantity: number; previousQuantity: number }[] = [];
    const movements: { productId: number; quantity: number; previousQuantity: number; newQuantity: number; notes: string }[] = [];

    for (const line of req.items) {
      if (line.quantity <= 0) throw new Error(`Cantidad inválida para producto ${line.productId}`);
      const prod = productMap.get(line.productId);
      if (!prod) throw new Error(`Producto no encontrado (id: ${line.productId})`);
      const prevQty = prod.quantity ?? 0;
      if (line.quantity > prevQty) {
        throw new Error(`Stock insuficiente para "${prod.name}" (disponible: ${prevQty})`);
      }
      const unitPrice = prod.listPrice ?? 0;
      const subtotalUsd = Math.round(unitPrice * line.quantity * 100) / 100;
      lineItems.push({ productId: prod.id!, quantity: line.quantity, unitPriceUsd: unitPrice, subtotalUsd });
      const newQty = prevQty - line.quantity;
      productUpdates.push({ id: prod.id!, newQuantity: newQty, previousQuantity: prevQty });
      movements.push({
        productId: prod.id!,
        quantity: line.quantity,
        previousQuantity: prevQty,
        newQuantity: newQty,
        notes: 'Venta POS',
      });
    }

    let subtotalUsd = lineItems.reduce((s, i) => s + i.subtotalUsd, 0);
    subtotalUsd = Math.round(subtotalUsd * 100) / 100;
    const totalUsd = Math.round(subtotalUsd * (1 - discountPercent / 100) * 100) / 100;
    const exchangeRate = await this.settingsRepo.getExchangeRate();
    const totalBs = Math.round(totalUsd * exchangeRate * 100) / 100;

    const saleId = await this.salesRepo.createSale(
      { totalUsd, totalBs, exchangeRate, discountPercent, notes: req.notes },
      lineItems,
      productUpdates,
      movements
    );
    return { id: saleId, totalUsd, totalBs };
  }

  async list(limit?: number) {
    return this.salesRepo.list(limit ?? 100);
  }

  async getById(id: number) {
    return this.salesRepo.getById(id);
  }
}
