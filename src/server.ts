import express from 'express';
import path from 'path';
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
import { startAutoBackupScheduler } from './services/autoBackupService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startAutoBackupScheduler();
});
