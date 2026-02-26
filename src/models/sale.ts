export interface SaleItem {
  id?: number;
  saleId?: number;
  productId: number;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

export type PaymentMethod = 'pago_movil' | 'tarjeta_debito' | 'efectivo_usd' | 'efectivo_bs';

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
  paymentMethod?: PaymentMethod | null;
  paymentBankCode?: string | null;
  paymentReference?: string | null;
  paymentCashReceived?: number | null;
  paymentChangeUsd?: number | null;
  paymentChangeBs?: number | null;
}

export interface SaleCreateRequest {
  items: { productId: number; quantity: number }[];
  discountPercent?: number;
  notes?: string;
  clientId?: number | null;
  paymentMethod: PaymentMethod;
  paymentBankCode?: string | null;
  paymentReference?: string | null;
  paymentCashReceived?: number | null;
  paymentChangeUsd?: number | null;
  paymentChangeBs?: number | null;
}
