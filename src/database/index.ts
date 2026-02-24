import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { getVenezuelaNow } from '../utils/venezuelaTime';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    db = await open({
      filename: './inventory.db',
      driver: sqlite3.Database,
    });

    // initialize schema for categories, products, movements, triggers, views, and default data
    await db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(isActive);

      CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT UNIQUE NOT NULL,
          barcode TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          categoryId INTEGER,
          brand TEXT,
          unitOfMeasure TEXT DEFAULT 'unidad',
          quantity INTEGER DEFAULT 0,
          minimumStock INTEGER DEFAULT 5,
          maximumStock INTEGER,
          listPrice REAL DEFAULT 0,
          costPrice REAL DEFAULT 0,
          supplierInfo TEXT,
          isActive BOOLEAN DEFAULT 1,
          imageUrl TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
          CHECK (quantity >= 0),
          CHECK (minimumStock >= 0),
          CHECK (costPrice >= 0),
          CHECK (listPrice >= 0)
      );
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(quantity, minimumStock);

      CREATE TABLE IF NOT EXISTS movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          productId INTEGER NOT NULL,
          movementType TEXT NOT NULL CHECK(movementType IN ('entrada','salida','ajuste','transferencia')),
          quantity INTEGER NOT NULL,
          previousQuantity INTEGER NOT NULL,
          newQuantity INTEGER NOT NULL,
          referenceNumber TEXT,
          reason TEXT,
          performedBy TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
          CHECK (quantity > 0)
      );
      CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(productId);
      CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(movementType);
      CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(createdAt);
      CREATE INDEX IF NOT EXISTS idx_movements_reference ON movements(referenceNumber);

      CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '36.50');

      CREATE TABLE IF NOT EXISTS exchange_rate_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rate REAL NOT NULL,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_created ON exchange_rate_history(createdAt);

      CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          totalUsd REAL NOT NULL,
          totalBs REAL NOT NULL,
          exchangeRate REAL NOT NULL,
          discountPercent REAL DEFAULT 0,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(createdAt);

      CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unitPriceUsd REAL NOT NULL,
          subtotalUsd REAL NOT NULL,
          FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (productId) REFERENCES products(id),
          CHECK (quantity > 0),
          CHECK (unitPriceUsd >= 0),
          CHECK (subtotalUsd >= 0)
      );
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(saleId);

      CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
      AFTER UPDATE ON categories
      BEGIN
          UPDATE categories SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
      AFTER UPDATE ON products
      BEGIN
          UPDATE products SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE VIEW IF NOT EXISTS view_low_stock AS
      SELECT 
          p.id,
          p.sku,
          p.name,
          p.quantity,
          p.minimumStock,
          c.name as categoryName,
          (p.minimumStock - p.quantity) as missingUnits
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.quantity <= p.minimumStock AND p.isActive = 1;

      CREATE VIEW IF NOT EXISTS view_inventory_value AS
      SELECT 
          SUM(quantity * costPrice) as totalCostValue,
          SUM(quantity * listPrice) as totalListValue,
          COUNT(DISTINCT id) as totalProducts,
          SUM(quantity) as totalUnits
      FROM products
      WHERE isActive = 1;

      INSERT OR IGNORE INTO categories (name, description) VALUES
          ('Comida y Bebidas', 'Alimentos y bebidas en general'),
          ('Abarrotes', 'Granos, enlatados, conservas'),
          ('Snacks', 'Papas, galletas, golosinas saladas'),
          ('Dulcería', 'Chocolates, caramelos, chicles'),
          ('Panadería', 'Pan, bollería, repostería'),
          ('Lácteos', 'Leche, queso, yogurt, mantequilla'),
          ('Bebidas', 'Refrescos, jugos, agua, energizantes'),
          ('Congelados', 'Productos congelados'),
          ('Frescos', 'Verduras, frutas, huevos'),
          ('Limpieza', 'Detergentes, cloro, desinfectantes'),
          ('Higiene personal', 'Jabón, shampoo, papel higiénico'),
          ('Papelería', 'Cuadernos, lápices, útiles escolares'),
          ('Electrónica', 'Pilas, cables, accesorios'),
          ('Oficina', 'Útiles de oficina'),
          ('Empaques', 'Bolsas, envases, empaque'),
          ('Mascotas', 'Alimento y accesorios para mascotas'),
          ('Cuidado del bebé', 'Pañales, fórmulas, biberones'),
          ('Farmacia básica', 'Medicamentos de venta libre'),
          ('Hogar', 'Artículos para el hogar'),
          ('Otros', 'Otros productos');
    `);

    const rateHistoryCount = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM exchange_rate_history');
    if (rateHistoryCount && rateHistoryCount.c === 0) {
      await db.run(
        'INSERT INTO exchange_rate_history (rate, notes, createdAt) VALUES (?, ?, ?)',
        36.5,
        'Tasa inicial',
        getVenezuelaNow()
      );
    }
  }

  return db;
}

export async function runTransaction<T>(
  fn: (db: Database<sqlite3.Database, sqlite3.Statement>) => Promise<T>
): Promise<T> {
  const database = await getDb();
  await database.run('BEGIN TRANSACTION');
  try {
    const result = await fn(database);
    await database.run('COMMIT');
    return result;
  } catch (e) {
    await database.run('ROLLBACK');
    throw e;
  }
}
