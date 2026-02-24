import express from 'express';
import path from 'path';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import movementRoutes from './routes/movementRoutes';
import saleRoutes from './routes/saleRoutes';
import settingsRoutes from './routes/settingsRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
