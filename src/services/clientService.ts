import { Client } from '../models/client';
import { ClientRepository } from '../repositories/clientRepository';

export class ClientService {
  private repo = new ClientRepository();

  async list(): Promise<Client[]> {
    return this.repo.getAll();
  }

  async search(term: string): Promise<Client[]> {
    return this.repo.search(term);
  }

  async get(id: number): Promise<Client | null> {
    return this.repo.getById(id);
  }

  async create(client: Client): Promise<number> {
    if (!client.name || !client.name.trim()) throw new Error('El nombre es obligatorio');
    return this.repo.create(client);
  }

  async update(id: number, client: Client): Promise<void> {
    if (!client.name || !client.name.trim()) throw new Error('El nombre es obligatorio');
    await this.repo.update(id, client);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
