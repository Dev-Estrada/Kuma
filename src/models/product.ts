// Product representa un artículo del inventario
export interface Product {
  id?: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: number;
  brand?: string;
  unitOfMeasure?: string;
  quantity?: number;
  minimumStock?: number;
  maximumStock?: number;
  costPrice?: number;
  listPrice?: number;
  supplierInfo?: string;
  isActive?: boolean;
  imageUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
