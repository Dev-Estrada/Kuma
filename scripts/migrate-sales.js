/**
 * Script para añadir las columnas status, voidedAt, voidReason, clientId a la tabla sales.
 * Ejecutar con: node scripts/migrate-sales.js
 * (desde la raíz del proyecto, con el servidor parado)
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la base de datos:', err.message);
    process.exit(1);
  }
  console.log('Base de datos abierta:', dbPath);
});

const alters = [
  "ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completada'",
  'ALTER TABLE sales ADD COLUMN voidedAt TEXT',
  'ALTER TABLE sales ADD COLUMN voidReason TEXT',
  'ALTER TABLE sales ADD COLUMN clientId INTEGER',
];

function run(i) {
  if (i >= alters.length) {
    db.run("UPDATE sales SET status = 'completada' WHERE status IS NULL", (err) => {
      if (err) console.warn('UPDATE status:', err.message);
      console.log('Migración completada.');
      db.close();
      process.exit(0);
    });
    return;
  }
  db.run(alters[i], (err) => {
    if (err) {
      if (err.message && err.message.toLowerCase().includes('duplicate column name')) {
        console.log('Columna ya existe:', alters[i].match(/ADD COLUMN (\w+)/)?.[1] || '');
      } else {
        console.error('Error:', err.message);
        db.close();
        process.exit(1);
      }
    } else {
      console.log('Añadida columna:', alters[i].match(/ADD COLUMN (\w+)/)?.[1] || '');
    }
    run(i + 1);
  });
}

run(0);
