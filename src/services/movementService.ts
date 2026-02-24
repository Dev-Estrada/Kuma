import { Movement } from '../models/movement';
import { MovementRepository } from '../repositories/movementRepository';

export class MovementService {
  private repo = new MovementRepository();

  async list(): Promise<Movement[]> {
    return this.repo.getAll();
  }

  async byProduct(productId: number): Promise<Movement[]> {
    return this.repo.getByProduct(productId);
  }

  async record(m: Movement): Promise<number> {
    // could add validations here
    return this.repo.create(m);
  }
}
