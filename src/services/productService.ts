import { Product } from '../models/product';
import { ProductRepository } from '../repositories/productRepository';

export class ProductService {
  private repo = new ProductRepository();

  async list(): Promise<Product[]> {
    return this.repo.getAll();
  }

  async search(term: string): Promise<Product[]> {
    return this.repo.search(term);
  }

  async get(id: number): Promise<Product | null> {
    return this.repo.getById(id);
  }

  async create(prod: Product): Promise<number> {
    if (!prod.name.trim()) {
      throw new Error('El nombre es obligatorio');
    }
    if (!prod.sku.trim()) {
      throw new Error('El SKU es obligatorio');
    }
    if (prod.quantity !== undefined && prod.quantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    if (prod.listPrice !== undefined && prod.listPrice < 0) {
      throw new Error('El precio de venta no puede ser negativo');
    }
    if (prod.costPrice !== undefined && prod.costPrice < 0) {
      throw new Error('El precio de costo no puede ser negativo');
    }
    return this.repo.create(prod);
  }

  async update(id: number, prod: Product): Promise<void> {
    if (!prod.name.trim()) {
      throw new Error('El nombre es obligatorio');
    }
    if (!prod.sku.trim()) {
      throw new Error('El SKU es obligatorio');
    }
    if (prod.quantity !== undefined && prod.quantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    if (prod.listPrice !== undefined && prod.listPrice < 0) {
      throw new Error('El precio de venta no puede ser negativo');
    }
    if (prod.costPrice !== undefined && prod.costPrice < 0) {
      throw new Error('El precio de costo no puede ser negativo');
    }
    await this.repo.update(id, prod);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async lowStock(): Promise<Product[]> {
    return this.repo.lowStock();
  }
}
