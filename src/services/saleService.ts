import { ProductRepository } from '../repositories/productRepository';
import { SettingsRepository } from '../repositories/settingsRepository';
import { SalesRepository } from '../repositories/salesRepository';
import { SaleCreateRequest, SalePaymentInput } from '../models/sale';

const VALID_PAYMENT_METHODS = ['pago_movil', 'tarjeta_debito', 'efectivo_usd', 'efectivo_bs', 'biopago'] as const;
const METHODS_REQUIRING_BANK_REF = ['pago_movil', 'tarjeta_debito', 'biopago'];

export class SaleService {
  private productRepo = new ProductRepository();
  private settingsRepo = new SettingsRepository();
  private salesRepo = new SalesRepository();

  private validatePayment(p: SalePaymentInput, index: number): void {
    if (!p.method || !VALID_PAYMENT_METHODS.includes(p.method)) {
      throw new Error(`Método de pago no válido en el pago #${index + 1}`);
    }
    if (typeof p.amountUsd !== 'number' || p.amountUsd <= 0) {
      throw new Error(`El monto del pago #${index + 1} debe ser mayor a 0`);
    }
    if (METHODS_REQUIRING_BANK_REF.includes(p.method)) {
      if (!(p.reference?.trim())) {
        throw new Error(`El pago #${index + 1} (${p.method}) requiere referencia de transacción`);
      }
    }
  }

  async createSale(req: SaleCreateRequest): Promise<{ id: number; totalUsd: number; totalBs: number }> {
    if (!req.items || req.items.length === 0) {
      throw new Error('Debe incluir al menos un producto en la venta');
    }
    if (!req.payments || req.payments.length === 0) {
      throw new Error('Debe incluir al menos un método de pago');
    }
    req.payments.forEach((p, i) => this.validatePayment(p, i));

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

    const sumPayments = req.payments.reduce((s, p) => s + p.amountUsd, 0);
    const sumRounded = Math.round(sumPayments * 100) / 100;
    if (sumRounded < totalUsd) {
      throw new Error(
        `La suma de los pagos ($${sumRounded.toFixed(2)} USD) es menor al total de la venta ($${totalUsd.toFixed(2)} USD). No se puede completar la factura.`
      );
    }

    const saleId = await this.salesRepo.createSale(
      {
        totalUsd,
        totalBs,
        exchangeRate,
        discountPercent,
        notes: req.notes,
        clientId: req.clientId ?? null,
      },
      req.payments.map((p) => ({
        method: p.method,
        amountUsd: Math.round(p.amountUsd * 100) / 100,
        bankCode: p.bankCode ?? null,
        reference: p.reference ?? null,
        mon: p.mon ?? null,
      })),
      lineItems,
      productUpdates,
      movements
    );
    return { id: saleId, totalUsd, totalBs };
  }

  async voidSale(id: number, reason?: string): Promise<void> {
    await this.salesRepo.voidSale(id, reason);
  }

  async list(limit?: number, fromDate?: string, toDate?: string) {
    if (fromDate && toDate) return this.salesRepo.listByDateRange(fromDate, toDate);
    return this.salesRepo.list(limit ?? 100);
  }

  async getById(id: number) {
    return this.salesRepo.getById(id);
  }
}
