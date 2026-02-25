import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { verifyPassword, signToken } from '../utils/auth';
import { AuthRequest } from '../middleware/authMiddleware';

const userRepo = new UserRepository();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
      return;
    }
    if (username.length > 64 || password.length > 256) {
      res.status(400).json({ error: 'Datos inválidos.' });
      return;
    }
    try {
      const user = await userRepo.getByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        return;
      }
      const token = signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }
    try {
      const user = await userRepo.getById(req.user.userId);
      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
        return;
      }
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      });
    } catch {
      res.status(500).json({ error: 'Error al obtener el usuario.' });
    }
  }
}
