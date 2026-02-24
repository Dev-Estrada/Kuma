// Movement registra un movimiento de inventario
export interface Movement {
  id?: number;
  productId: number;
  movementType: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceNumber?: string;
  reason?: string;
  performedBy?: string;
  notes?: string;
  createdAt?: string;
}
