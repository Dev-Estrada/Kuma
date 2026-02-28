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

  async getByBarcode(barcode: string): Promise<Product | null> {
    return this.repo.getByBarcodeActive(barcode);
  }

  /** Búsqueda unificada POS: por ID, código de barras, SKU o nombre */
  async posSearch(term: string, limit?: number): Promise<Product[]> {
    return this.repo.posSearch(term, limit ?? 50);
  }

  async create(prod: Product): Promise<number> {
    const name = prod?.name != null ? String(prod.name).trim() : '';
    const sku = prod?.sku != null ? String(prod.sku).trim() : '';
    if (!name) {
      throw new Error('El nombre es obligatorio');
    }
    if (!sku) {
      throw new Error('El SKU es obligatorio');
    }
    const existingSku = await this.repo.getBySku(sku);
    if (existingSku) {
      throw new Error('Ya existe un producto con ese SKU.');
    }
    const barcode = (prod.barcode && String(prod.barcode).trim()) || null;
    if (barcode) {
      const existingBarcode = await this.repo.getByBarcode(barcode);
      if (existingBarcode) {
        throw new Error('Ya existe un producto con ese código de barras.');
      }
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
    return this.repo.create({ ...prod, name, sku });
  }

  async update(id: number, prod: Product): Promise<void> {
    const name = prod?.name != null ? String(prod.name).trim() : '';
    const sku = prod?.sku != null ? String(prod.sku).trim() : '';
    if (!name) {
      throw new Error('El nombre es obligatorio');
    }
    if (!sku) {
      throw new Error('El SKU es obligatorio');
    }
    const existingSku = await this.repo.getBySku(sku, id);
    if (existingSku) {
      throw new Error('Ya existe otro producto con ese SKU.');
    }
    const barcode = (prod.barcode && String(prod.barcode).trim()) || null;
    if (barcode) {
      const existingBarcode = await this.repo.getByBarcode(barcode, id);
      if (existingBarcode) {
        throw new Error('Ya existe otro producto con ese código de barras.');
      }
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
    await this.repo.update(id, { ...prod, name, sku });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async lowStock(): Promise<Product[]> {
    return this.repo.lowStock();
  }

  async getExpiring(days?: number): Promise<Product[]> {
    return this.repo.getExpiring(days ?? 30);
  }

  async setFavorite(id: number, isFavorite: boolean): Promise<void> {
    await this.repo.setFavorite(id, isFavorite);
  }

  async exportCsv(): Promise<string> {
    const products = await this.repo.getAll();
    const headers = [
      'sku',
      'name',
      'barcode',
      'categoryName',
      'quantity',
      'unitOfMeasure',
      'listPrice',
      'costPrice',
      'minimumStock',
      'maximumStock',
      'brand',
      'expiryDate',
      'isFavorite',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = products.map((p) =>
      headers.map((h) => escape((p as unknown as Record<string, unknown>)[h])).join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
  }
}
