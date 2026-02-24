export interface SaleItem {
  id?: number;
  saleId?: number;
  productId: number;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

export interface Sale {
  id?: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  discountPercent?: number;
  notes?: string;
  status?: 'completada' | 'anulada';
  voidedAt?: string;
  voidReason?: string;
  clientId?: number | null;
  createdAt?: string;
  items?: SaleItem[];
}

export interface SaleCreateRequest {
  items: { productId: number; quantity: number }[];
  discountPercent?: number;
  notes?: string;
  clientId?: number | null;
}
