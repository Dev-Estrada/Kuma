import { Movement } from '../models/movement';
import { MovementRepository } from '../repositories/movementRepository';
import { ProductRepository } from '../repositories/productRepository';

export class MovementService {
  private repo = new MovementRepository();
  private productRepo = new ProductRepository();

  async list(): Promise<Movement[]> {
    return this.repo.getAll();
  }

  async byProduct(productId: number): Promise<Movement[]> {
    return this.repo.getByProduct(productId);
  }

  async record(m: Movement): Promise<number> {
    return this.repo.create(m);
  }

  async recordAdjustment(productId: number, quantityDelta: number, reason?: string): Promise<void> {
    if (quantityDelta === 0) throw new Error('El ajuste no puede ser cero');
    const product = await this.productRepo.getById(productId);
    if (!product) throw new Error('Producto no encontrado');
    const previousQuantity = product.quantity ?? 0;
    const newQuantity = previousQuantity + quantityDelta;
    if (newQuantity < 0) throw new Error('Stock insuficiente para este ajuste');
    await this.productRepo.updateQuantity(productId, newQuantity);
    const movement: Movement = {
      productId,
      movementType: 'ajuste',
      quantity: Math.abs(quantityDelta),
      previousQuantity,
      newQuantity,
      reason: reason ?? 'Ajuste de inventario',
      notes: reason ?? 'Ajuste de inventario',
    };
    await this.repo.create(movement);
  }

  /** Entrada de mercancía: aumenta stock y registra movimiento tipo entrada */
  async recordEntry(productId: number, quantity: number, reference?: string, reason?: string): Promise<number> {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a cero');
    const product = await this.productRepo.getById(productId);
    if (!product) throw new Error('Producto no encontrado');
    const previousQuantity = product.quantity ?? 0;
    const newQuantity = previousQuantity + quantity;
    await this.productRepo.updateQuantity(productId, newQuantity);
    const movement: Movement = {
      productId,
      movementType: 'entrada',
      quantity,
      previousQuantity,
      newQuantity,
      referenceNumber: reference || undefined,
      reason: reason || 'Entrada de mercancía',
      notes: reason || 'Entrada de mercancía',
    };
    return this.repo.create(movement);
  }
}
