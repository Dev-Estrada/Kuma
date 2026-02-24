import { Category } from '../models/category';
import { CategoryRepository } from '../repositories/categoryRepository';

export class CategoryService {
  private repo = new CategoryRepository();

  async list(): Promise<Category[]> {
    return this.repo.getAll();
  }

  async get(id: number): Promise<Category | null> {
    return this.repo.getById(id);
  }

  async create(cat: Category): Promise<number> {
    if (!cat.name.trim()) {
      throw new Error('El nombre es obligatorio');
    }
    return this.repo.create(cat);
  }

  async update(id: number, cat: Category): Promise<void> {
    if (!cat.name.trim()) {
      throw new Error('El nombre es obligatorio');
    }
    await this.repo.update(id, cat);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
