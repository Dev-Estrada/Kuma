import { Movement } from '../models/movement';
import { getDb } from '../database';
import { getVenezuelaNow } from '../utils/venezuelaTime';

export class MovementRepository {
  async getAll(): Promise<Movement[]> {
    const db = await getDb();
    return db.all<Movement[]>('SELECT * FROM movements');
  }

  async getByProduct(productId: number): Promise<Movement[]> {
    const db = await getDb();
    return db.all<Movement[]>(
      'SELECT * FROM movements WHERE productId = ? ORDER BY createdAt DESC',
      productId
    );
  }

  async create(move: Movement): Promise<number> {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO movements
       (productId, movementType, quantity, previousQuantity, newQuantity,
        referenceNumber, reason, performedBy, notes, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      move.productId,
      move.movementType,
      move.quantity,
      move.previousQuantity,
      move.newQuantity,
      move.referenceNumber || null,
      move.reason || null,
      move.performedBy || null,
      move.notes || null,
      getVenezuelaNow()
    );
    return result.lastID as number;
  }
}
