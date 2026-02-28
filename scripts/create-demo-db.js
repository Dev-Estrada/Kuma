/**
 * Genera la base de datos de demostración demoBD.db con categorías, Productos,
 * clientes, ventas, movimientos, usuarios, tasa de cambio, vistas e índices.
 * Ejecutar desde la raíz: node scripts/create-demo-db.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha256';

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function exec(db, sqlBlock) {
  return new Promise((resolve, reject) => {
    db.exec(sqlBlock, (err) => (err ? reject(err) : resolve()));
  });
}

const outPath = path.join(process.cwd(), 'demoBD.db');
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const db = new sqlite3.Database(outPath, (err) => {
  if (err) {
    console.error('Error creando base de datos:', err.message);
    process.exit(1);
  }
  console.log('Creando demoBD.db en', outPath);
});

async function main() {
  await run(db, 'PRAGMA foreign_keys = ON');

  await exec(db, `
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE products (
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
    CREATE TABLE movements (
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
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      displayName TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE exchange_rate_history (id INTEGER PRIMARY KEY AUTOINCREMENT, rate REAL NOT NULL, notes TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, document TEXT, phone TEXT, email TEXT, address TEXT, notes TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE sales (id INTEGER PRIMARY KEY AUTOINCREMENT, totalUsd REAL NOT NULL, totalBs REAL NOT NULL, exchangeRate REAL NOT NULL, discountPercent REAL DEFAULT 0, notes TEXT, status TEXT DEFAULT 'completada' CHECK(status IN ('completada','anulada')), voidedAt TEXT, voidReason TEXT, clientId INTEGER, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (clientId) REFERENCES clients(id));
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, saleId INTEGER NOT NULL, productId INTEGER NOT NULL, quantity INTEGER NOT NULL, unitPriceUsd REAL NOT NULL, subtotalUsd REAL NOT NULL, FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE, FOREIGN KEY (productId) REFERENCES products(id), CHECK (quantity > 0), CHECK (unitPriceUsd >= 0), CHECK (subtotalUsd >= 0));
  `);

  await exec(db, `
    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(isActive);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(quantity, minimumStock);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(productId);
    CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(movementType);
    CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(createdAt);
    CREATE INDEX IF NOT EXISTS idx_movements_reference ON movements(referenceNumber);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_created ON exchange_rate_history(createdAt);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(createdAt);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
    CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(clientId);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(saleId);
  `);

  const categories = [
    ['Comida y Bebidas', 'Alimentos y bebidas en general'],
    ['Abarrotes', 'Granos, enlatados, conservas'],
    ['Snacks', 'Papas, galletas, golosinas saladas'],
    ['Dulcería', 'Chocolates, caramelos, chicles'],
    ['Panadería', 'Pan, bollería, repostería'],
    ['Lácteos', 'Leche, queso, yogurt, mantequilla'],
    ['Bebidas', 'Refrescos, jugos, agua, energizantes'],
    ['Congelados', 'Productos congelados'],
    ['Frescos', 'Verduras, frutas, huevos'],
    ['Limpieza', 'Detergentes, cloro, desinfectantes'],
    ['Higiene personal', 'Jabón, shampoo, papel higiénico'],
    ['Papelería', 'Cuadernos, lápices, útiles escolares'],
    ['Electrónica', 'Pilas, cables, accesorios'],
    ['Oficina', 'Útiles de oficina'],
    ['Empaques', 'Bolsas, envases, empaque'],
    ['Mascotas', 'Alimento y accesorios para mascotas'],
    ['Cuidado del bebé', 'Pañales, fórmulas, biberones'],
    ['Farmacia básica', 'Medicamentos de venta libre'],
    ['Hogar', 'Artículos para el hogar'],
    ['Otros', 'Otros Productos'],
  ];

  for (const [name, desc] of categories) {
    await run(db, 'INSERT INTO categories (name, description) VALUES (?, ?)', [name, desc]);
  }
  console.log('Categorías insertadas.');

  const productTemplates = [
    [1, ['Arroz 1kg', 'Harina 1kg', 'Aceite 900ml', 'Pasta 500g', 'Salsa tomate 400g']],
    [2, ['Arvejas enlatadas', 'Maíz enlatado', 'Atún en lata', 'Frijoles 400g', 'Lentejas 500g']],
    [3, ['Papas fritas 150g', 'Galletas saladas', 'Maní con pasas', 'Palitos de queso', 'Nachos 200g']],
    [4, ['Chocolate tableta', 'Caramelos surtidos', 'Chicles menta', 'Gomitas 100g', 'Alfajor']],
    [5, ['Pan de sandwich', 'Pan integral', 'Croissant', 'Pan dulce', 'Tostadas']],
    [6, ['Leche 1L', 'Queso crema', 'Yogurt natural', 'Mantequilla 200g', 'Leche condensada']],
    [7, ['Refresco 2L', 'Jugo naranja 1L', 'Agua 500ml', 'Energizante 250ml', 'Café 200g']],
    [8, ['Pizza congelada', 'Nuggets', 'Helado 1L', 'Verduras congeladas', 'Empanadas']],
    [9, ['Tomates 500g', 'Cebolla 1kg', 'Plátanos', 'Manzanas 1kg', 'Huevos 30u']],
    [10, ['Detergente 1L', 'Cloro 1L', 'Lavavajillas', 'Desinfectante', 'Jabón en polvo']],
    [11, ['Jabón barra', 'Shampoo 400ml', 'Papel higiénico 4 rollos', 'Pasta dental', 'Desodorante']],
    [12, ['Cuaderno 100 hojas', 'Lápiz HB', 'Bolígrafo', 'Goma', 'Resaltador']],
    [13, ['Pilas AA 4u', 'Cable USB', 'Adaptador', 'Audífonos', 'Cargador']],
    [14, ['Clips', 'Cinta adhesiva', 'Carpeta', 'Sobre manila', 'Marcadores']],
    [15, ['Bolsas 50u', 'Envase 1L', 'Papel aluminio', 'Film plástico', 'Bandeja']],
    [16, ['Comida perro 1kg', 'Arena gato', 'Snack perro', 'Comida gato 500g', 'Correa']],
    [17, ['Pañales M 24u', 'Toallas húmedas', 'Fórmula 400g', 'Biberón', 'Talco bebé']],
    [18, ['Paracetamol', 'Vitamina C', 'Antigripal', 'Crema corporal', 'Jarabes']],
    [19, ['Focos 2u', 'Velas', 'Pilas reloj', 'Cinta aislante', 'Pegamento']],
    [20, ['Pilas 9V', 'Pegamento', 'Cordel', 'Cinta métrica', 'Clavo 1kg']],
  ];

  const brands = ['Marca Demo', 'SuperMax', 'Alimentos Norte', 'Bebidas Sur', null, null, null];
  let productId = 1;
  for (const [catId, names] of productTemplates) {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const listPrice = Math.round((1.5 + Math.random() * 15) * 100) / 100;
      const costPrice = Math.round(listPrice * (0.4 + Math.random() * 0.4) * 100) / 100;
      const qty = Math.floor(100 + Math.random() * 150);
      const maxStock = Math.floor(qty * (1.2 + Math.random() * 0.5));
      const barcode = productId <= 50 ? `789${String(productId).padStart(10, '0')}` : null;
      const isFav = productId <= 10 ? 1 : 0;
      const expiryDays = productId <= 8 && [1, 2, 6, 7, 9].includes(productId) ? 15 + Math.floor(Math.random() * 60) : null;
      const expiryDate = expiryDays ? (() => { const d = new Date(); d.setDate(d.getDate() + expiryDays); return d.toISOString().slice(0, 10); })() : null;
      const brand = brands[productId % brands.length];

      await run(db, `INSERT INTO products (sku, barcode, name, categoryId, unitOfMeasure, quantity, minimumStock, maximumStock, listPrice, costPrice, isActive, isFavorite, expiryDate, brand) VALUES (?, ?, ?, ?, 'unidad', ?, 5, ?, ?, ?, 1, ?, ?, ?)`, [
        `DEMO-${String(productId).padStart(4, '0')}`,
        barcode,
        name,
        catId,
        qty,
        maxStock,
        listPrice,
        costPrice,
        isFav,
        expiryDate,
        brand,
      ]);
      productId++;
    }
  }

  const products = await all(db, 'SELECT id, quantity FROM products ORDER BY id');
  for (const p of products) {
    await run(db, 'INSERT INTO movements (productId, movementType, quantity, previousQuantity, newQuantity, reason, referenceNumber, createdAt) VALUES (?, ?, ?, 0, ?, ?, ?, ?)', [
      p.id,
      'entrada',
      p.quantity,
      p.quantity,
      'Stock inicial demo',
      'INIT-DEMO',
      dateStr(60),
    ]);
  }
  console.log('Productos y movimientos de entrada creados.');

  const adminHash = hashPassword('Admin123!');
  const userHash = hashPassword('User123!');
  await run(db, 'INSERT INTO users (username, passwordHash, displayName, role) VALUES (?, ?, ?, ?)', ['admin', adminHash, 'Administrador', 'admin']);
  await run(db, 'INSERT INTO users (username, passwordHash, displayName, role) VALUES (?, ?, ?, ?)', ['user', userHash, 'Usuario Demo', 'user']);
  console.log('Usuarios: admin / Admin123!  y  user / User123!');

  await run(db, "INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '36.50')");
  for (let i = 0; i < 15; i++) {
    await run(db, 'INSERT INTO exchange_rate_history (rate, notes, createdAt) VALUES (?, ?, ?)', [
      Math.round((35 + Math.random() * 5) * 100) / 100,
      `Tasa demo ${i + 1}`,
      dateStr(45 - i * 3),
    ]);
  }

  const clientData = [
    { name: 'María González', document: 'V-12345678', phone: '04141234567', email: 'maria.g@email.com', address: 'Av. Principal 123', notes: 'Cliente frecuente' },
    { name: 'Juan Pérez', document: 'V-23456789', phone: '04241234567', email: null, address: 'Calle 5 con 6', notes: null },
    { name: 'Tienda La Esquina', document: 'J-30123456', phone: '04149876543', email: 'tienda.esquina@negocio.com', address: 'Esq. Principal', notes: 'Mayorista' },
    { name: 'Ana Rodríguez', document: 'V-34567890', phone: null, email: 'ana.r@email.com', address: null, notes: null },
    { name: 'Carlos López', document: null, phone: '04161234567', email: null, address: 'Barrio Centro', notes: null },
    { name: 'Abastos El Ahorro', document: 'J-40123456', phone: '04249876543', email: 'abastos@email.com', address: 'Zona industrial', notes: 'Pedidos grandes' },
    { name: 'Pedro Sánchez', document: 'V-45678901', phone: '04149870001', email: null, address: null, notes: null },
    { name: 'Carmen Díaz', document: null, phone: '04241230002', email: 'carmen.d@email.com', address: 'Urbanización Los Olivos', notes: null },
    { name: 'Bodega Central', document: 'J-50123456', phone: '04161230003', email: 'bodega.central@email.com', address: 'Av. Comercio 45', notes: 'Pago contado' },
    { name: 'Luis Martínez', document: 'V-56789012', phone: null, email: null, address: null, notes: null },
    { name: 'Super Mini', document: 'J-60123456', phone: '04149870004', email: null, address: 'Calle 10', notes: null },
    { name: 'Rosa Fernández', document: 'V-67890123', phone: '04241230005', email: 'rosa.f@email.com', address: null, notes: null },
    { name: 'José Ramírez', document: null, phone: '04161230006', email: null, address: 'Sector Este', notes: null },
    { name: 'Panadería Doña Lupe', document: 'J-70123456', phone: '04149870007', email: 'donalupe@email.com', address: 'Plaza Principal', notes: 'Cliente preferencial' },
    { name: 'Farmacia San José', document: 'J-80123456', phone: '04241230008', email: 'farmacia.sj@email.com', address: 'Av. Salud 22', notes: 'Descuento 5%' },
  ];

  for (const c of clientData) {
    await run(db, 'INSERT INTO clients (name, document, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)', [
      c.name,
      c.document || null,
      c.phone || null,
      c.email || null,
      c.address || null,
      c.notes || null,
    ]);
  }
  console.log('Clientes insertados.');

  const rate = 36.5;
  const productRows = await all(db, 'SELECT id, listPrice, quantity FROM products WHERE isActive = 1 ORDER BY id');
  const salesToCreate = [];
  for (let day = 0; day < 45; day++) {
    const numSales = 2 + Math.floor(Math.random() * 6);
    for (let s = 0; s < numSales; s++) salesToCreate.push({ daysAgo: day });
  }

  for (const { daysAgo } of salesToCreate) {
    const numItems = 1 + Math.floor(Math.random() * 6);
    const items = [];
    const used = new Set();
    let attempts = 0;
    while (items.length < numItems && attempts < 50) {
      attempts++;
      const p = productRows[Math.floor(Math.random() * productRows.length)];
      if (!p || used.has(p.id)) continue;
      const maxQty = Math.min(1 + Math.floor(Math.random() * 5), p.quantity);
      if (maxQty < 1) continue;
      used.add(p.id);
      items.push({ productId: p.id, quantity: maxQty, unitPrice: p.listPrice });
    }
    if (items.length === 0) continue;

    const subtotalUsd = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = Math.random() > 0.8 ? 5 + Math.floor(Math.random() * 10) : 0;
    const totalUsd = Math.round(subtotalUsd * (1 - discount / 100) * 100) / 100;
    const totalBs = Math.round(totalUsd * rate * 100) / 100;
    const clientId = Math.random() > 0.5 ? 1 + Math.floor(Math.random() * clientData.length) : null;

    const result = await run(db, 'INSERT INTO sales (totalUsd, totalBs, exchangeRate, discountPercent, status, clientId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      totalUsd,
      totalBs,
      rate,
      discount,
      'completada',
      clientId,
      dateStr(daysAgo),
    ]);
    const saleId = result.lastID;

    for (const it of items) {
      const subtotal = Math.round(it.quantity * it.unitPrice * 100) / 100;
      await run(db, 'INSERT INTO sale_items (saleId, productId, quantity, unitPriceUsd, subtotalUsd) VALUES (?, ?, ?, ?, ?)', [
        saleId,
        it.productId,
        it.quantity,
        it.unitPrice,
        subtotal,
      ]);
    }
  }

  const soldPerProduct = await all(db, `SELECT productId, SUM(quantity) as sold FROM sale_items si JOIN sales s ON s.id = si.saleId AND s.status = 'completada' GROUP BY productId`);
  for (const row of soldPerProduct) {
    await run(db, 'UPDATE products SET quantity = quantity - ? WHERE id = ?', [row.sold, row.productId]);
  }
  await run(db, 'UPDATE products SET quantity = CASE WHEN quantity < 0 THEN 0 ELSE quantity END');

  for (const row of soldPerProduct) {
    const p = await get(db, 'SELECT quantity FROM products WHERE id = ?', [row.productId]);
    const currentQty = p?.quantity ?? 0;
    const previousQty = currentQty + row.sold;
    await run(db, 'INSERT INTO movements (productId, movementType, quantity, previousQuantity, newQuantity, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      row.productId,
      'salida',
      row.sold,
      previousQty,
      currentQty,
      'Venta demo',
      dateStr(Math.min(1, Math.floor(row.sold % 5))),
    ]);
  }
  console.log('Ventas y movimientos de salida creados.');

  await exec(db, `
    CREATE TRIGGER IF NOT EXISTS update_categories_timestamp AFTER UPDATE ON categories BEGIN UPDATE categories SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS update_products_timestamp AFTER UPDATE ON products BEGIN UPDATE products SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
  `);

  await exec(db, `
    CREATE VIEW IF NOT EXISTS view_low_stock AS
    SELECT p.id, p.sku, p.name, p.quantity, p.minimumStock, c.name as categoryName, (p.minimumStock - p.quantity) as missingUnits
    FROM products p LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.quantity <= p.minimumStock AND p.isActive = 1;

    CREATE VIEW IF NOT EXISTS view_inventory_value AS
    SELECT SUM(quantity * costPrice) as totalCostValue, SUM(quantity * listPrice) as totalListValue, COUNT(DISTINCT id) as totalProducts, SUM(quantity) as totalUnits
    FROM products WHERE isActive = 1;
  `);

  const counts = await get(db, 'SELECT (SELECT COUNT(*) FROM products) as products, (SELECT COUNT(*) FROM movements) as movements, (SELECT COUNT(*) FROM sales) as sales');
  console.log('demoBD.db creada correctamente.');
  console.log('Resumen: Productos:', counts.products, '| movimientos:', counts.movements, '| ventas:', counts.sales);
  db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  db.close();
  process.exit(1);
});
