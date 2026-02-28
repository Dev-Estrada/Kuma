import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { open, Database } from 'sqlite';
import { getVenezuelaNow } from '../utils/venezuelaTime';
import { hashPassword } from '../utils/auth';

const DB_FILENAME = './inventory.db';
const DB_RESTORE = './inventory.db.restore';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    const cwd = process.cwd();
    const restorePath = path.resolve(cwd, DB_RESTORE.replace(/^\.\//, ''));
    const dbPath = path.resolve(cwd, DB_FILENAME.replace(/^\.\//, ''));
    if (fs.existsSync(restorePath)) {
      try {
        if (fs.existsSync(dbPath)) fs.renameSync(dbPath, dbPath + '.bak');
        fs.renameSync(restorePath, dbPath);
      } catch (_) {}
    }
    db = await open({
      filename: dbPath,
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
          isFavorite BOOLEAN DEFAULT 0,
          imageUrl TEXT,
          notes TEXT,
          expiryDate TEXT,
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

      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          passwordHash TEXT NOT NULL,
          displayName TEXT,
          role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

      CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '00.00');

      CREATE TABLE IF NOT EXISTS exchange_rate_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rate REAL NOT NULL,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_created ON exchange_rate_history(createdAt);

      CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          document TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

      CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          totalUsd REAL NOT NULL,
          totalBs REAL NOT NULL,
          exchangeRate REAL NOT NULL,
          discountPercent REAL DEFAULT 0,
          notes TEXT,
          status TEXT DEFAULT 'completada' CHECK(status IN ('completada','anulada')),
          voidedAt TEXT,
          voidReason TEXT,
          clientId INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (clientId) REFERENCES clients(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(createdAt);
      CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
      CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(clientId);

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
    `);

    const rateHistoryCount = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM exchange_rate_history');
    if (rateHistoryCount && rateHistoryCount.c === 0) {
      await db.run(
        'INSERT INTO exchange_rate_history (rate, notes, createdAt) VALUES (?, ?, ?)',
        36.5,
        'Tasa Demostracion',
        getVenezuelaNow()
      );
    }

    try { await db.run('ALTER TABLE products ADD COLUMN isFavorite BOOLEAN DEFAULT 0'); } catch (_) {}
    try { await db.run('ALTER TABLE products ADD COLUMN expiryDate TEXT'); } catch (_) {}
    try { await db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      document TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`); } catch (_) {}
    try { await db.run('ALTER TABLE clients ADD COLUMN address TEXT'); } catch (_) {}

    // Migraciones para sales: añadir columnas si no existen (ignorar solo "duplicate column name")
    const database = db;
    const addColumnIfMissing = async (sql: string): Promise<void> => {
      try {
        await database.run(sql);
      } catch (err: unknown) {
        const msg = (err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : String(err)).toLowerCase();
        if (!msg.includes('duplicate column name')) throw err;
      }
    };
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN status TEXT DEFAULT \'completada\'');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN voidedAt TEXT');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN voidReason TEXT');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN clientId INTEGER');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentMethod TEXT');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentBankCode TEXT');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentReference TEXT');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentCashReceived REAL');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentChangeUsd REAL');
    await addColumnIfMissing('ALTER TABLE sales ADD COLUMN paymentChangeBs REAL');
    try {
      await db.run('UPDATE sales SET status = \'completada\' WHERE status IS NULL');
    } catch (_) {
      // La tabla sales puede ser de una versión antigua sin columna status; la migración ADD COLUMN ya la añadió o se ignoró
    }

    // Tabla de pagos por venta (múltiples métodos por venta)
    await db.run(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        method TEXT NOT NULL,
        amountUsd REAL NOT NULL,
        bankCode TEXT,
        reference TEXT,
        mon TEXT,
        FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
        CHECK (amountUsd >= 0)
      )
    `);
    try { await db.run('CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(saleId)'); } catch (_) {}

    try { await db.run('CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)'); } catch (_) {}
    try { await db.run('CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(clientId)'); } catch (_) {}

    // Usuario administrador por defecto si no existe ningún admin activo (contraseña: Admin123!)
    const adminCount = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND isActive = 1");
    if (adminCount && adminCount.c === 0) {
      const adminHash = hashPassword('Admin123!');
      const existingAdmin = await db.get<{ id: number }>('SELECT id FROM users WHERE username = ?', 'admin');
      if (existingAdmin) {
        await db.run(
          'UPDATE users SET passwordHash = ?, displayName = ?, role = ?, isActive = 1 WHERE username = ?',
          adminHash,
          'Administrador',
          'admin',
          'admin'
        );
      } else {
        await db.run(
          'INSERT INTO users (username, passwordHash, displayName, role) VALUES (?, ?, ?, ?)',
          'admin',
          adminHash,
          'Administrador',
          'admin'
        );
      }
    }
  }
  if (!db) throw new Error('Database not initialized');
  return db;
}

/** Cierra la conexión a la base de datos. Tras esto, la siguiente llamada a getDb() la reabrirá. */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/** Cierra la conexión y elimina el archivo inventory.db. La siguiente llamada a getDb() creará una base de datos nueva. */
export async function deleteCurrentDatabase(): Promise<void> {
  await closeDb();
  const cwd = process.cwd();
  const dbPath = path.resolve(cwd, DB_FILENAME.replace(/^\.\//, ''));
  try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  } catch (_) {
    // ignorar si no se puede eliminar
  }
}

/**
 * Cierra la conexión y aplica el archivo inventory.db.restore (si existe) sobre inventory.db.
 * La siguiente llamada a getDb() abrirá la base de datos ya restaurada. No hace falta reiniciar el servidor.
 */
export async function applyRestoreNow(): Promise<void> {
  await closeDb();
  const cwd = process.cwd();
  const restorePath = path.resolve(cwd, DB_RESTORE.replace(/^\.\//, ''));
  const dbPath = path.resolve(cwd, DB_FILENAME.replace(/^\.\//, ''));
  if (fs.existsSync(restorePath)) {
    try {
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, dbPath + '.bak');
      fs.renameSync(restorePath, dbPath);
    } catch (_) {
      // si falla, getDb() intentará aplicar .restore en el próximo arranque
    }
  }
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
