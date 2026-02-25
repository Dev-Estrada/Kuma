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
    const doc = (client.document && client.document.trim()) || '';
    if (doc) {
      const existing = await this.repo.getByDocument(doc);
      if (existing) throw new Error('Ya existe un cliente con esa cédula/documento.');
    }
    return this.repo.create(client);
  }

  async update(id: number, client: Client): Promise<void> {
    if (!client.name || !client.name.trim()) throw new Error('El nombre es obligatorio');
    const doc = (client.document && client.document.trim()) || '';
    if (doc) {
      const existing = await this.repo.getByDocument(doc, id);
      if (existing) throw new Error('Ya existe otro cliente con esa cédula/documento.');
    }
    await this.repo.update(id, client);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
