import express from 'express';
import path from 'path';
import http from 'http';
import { getDataDir } from './dataDir';
import { authMiddleware } from './middleware/authMiddleware';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import movementRoutes from './routes/movementRoutes';
import saleRoutes from './routes/saleRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportsRoutes from './routes/reportsRoutes';
import backupRoutes from './routes/backupRoutes';
import clientRoutes from './routes/clientRoutes';
import notificationsRoutes from './routes/notificationsRoutes';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
// En Electron, servir branding desde el directorio de datos del usuario
if (process.env.KUMA_DATA_DIR) {
  app.use('/assets/branding', express.static(path.join(getDataDir(), 'branding')));
}
// Módulos ES se piden sin .js (ej. /js/shared/banks); servir con extensión .js para que no caigan en auth
app.use('/js', express.static(path.join(__dirname, '../public/js'), { extensions: ['js'] }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(authMiddleware);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/notifications', notificationsRoutes);

/** Inicia el servidor. Exportado para que Electron pueda arrancarlo. */
export function start(): http.Server {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  return server;
}

// Al ejecutar con node directamente (npm start), arrancar el servidor
if (require.main === module) {
  start();
}
