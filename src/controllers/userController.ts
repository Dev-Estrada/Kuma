import { Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { hashPassword } from '../utils/auth';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserCreate, UserUpdate } from '../models/user';

const userRepo = new UserRepository();

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{2,64}$/;
const PASSWORD_MIN_LEN = 8;

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LEN) return `La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres.`;
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.';
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una minúscula.';
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

export class UserController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await userRepo.list();
      res.json(users);
    } catch {
      res.status(500).json({ error: 'Error al listar usuarios.' });
    }
  }

  async getOne(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    try {
      const user = await userRepo.getById(id);
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      res.json(user);
    } catch {
      res.status(500).json({ error: 'Error al obtener el usuario.' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const body = req.body as UserCreate;
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;
    const role = body.role === 'admin' ? 'admin' : 'user';

    if (!username) {
      res.status(400).json({ error: 'El nombre de usuario es obligatorio.' });
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      res.status(400).json({ error: 'El usuario solo puede contener letras, números, puntos, guiones y guión bajo (2-64 caracteres).' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'La contraseña es obligatoria.' });
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      res.status(400).json({ error: pwdErr });
      return;
    }

    try {
      const existing = await userRepo.getByUsername(username);
      if (existing) {
        res.status(400).json({ error: 'Ese nombre de usuario ya existe.' });
        return;
      }
      const passwordHash = hashPassword(password);
      const id = await userRepo.create(username, passwordHash, displayName, role);
      res.status(201).json({ id });
    } catch {
      res.status(500).json({ error: 'Error al crear el usuario.' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    const body = req.body as UserUpdate;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;
    const password = typeof body.password === 'string' ? body.password : undefined;
    const role = body.role === 'admin' ? 'admin' : body.role === 'user' ? 'user' : undefined;
    const isActive = body.isActive === undefined ? undefined : !!body.isActive;

    try {
      const user = await userRepo.getById(id);
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      const updates: { displayName?: string; passwordHash?: string; role?: string; isActive?: boolean } = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (password !== undefined && password !== '') {
        const pwdErr = validatePassword(password);
        if (pwdErr) {
          res.status(400).json({ error: pwdErr });
          return;
        }
        updates.passwordHash = hashPassword(password);
      }
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No hay cambios que aplicar.' });
        return;
      }
      // No permitir desactivar el último admin
      if (updates.isActive === false && user.role === 'admin') {
        const adminCount = await userRepo.countAdmins();
        if (adminCount <= 1) {
          res.status(400).json({ error: 'No se puede desactivar el único administrador.' });
          return;
        }
      }
      await userRepo.update(id, updates);
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Error al actualizar el usuario.' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    const currentUserId = req.user?.userId;
    if (id === currentUserId) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
      return;
    }
    try {
      const user = await userRepo.getById(id);
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      if (user.role === 'admin') {
        const adminCount = await userRepo.countAdmins();
        if (adminCount <= 1) {
          res.status(400).json({ error: 'No se puede eliminar el único administrador.' });
          return;
        }
      }
      await userRepo.delete(id);
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Error al eliminar el usuario.' });
    }
  }
}
