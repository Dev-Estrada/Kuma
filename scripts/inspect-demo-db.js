const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'demoBD.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function main() {
  const tables = await run("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables:', tables.map((r) => r.name).join(', '));
  const productCols = await run('PRAGMA table_info(products)');
  console.log('Products columns:', productCols.map((c) => c.name).join(', '));
  const salesCols = await run('PRAGMA table_info(sales)');
  console.log('Sales columns:', salesCols.map((c) => c.name).join(', '));
  const views = await run("SELECT name FROM sqlite_master WHERE type='view'");
  console.log('Views:', views.length ? views.map((r) => r.name).join(', ') : 'none');
  const counts = await run('SELECT (SELECT COUNT(*) FROM products) as products, (SELECT COUNT(*) FROM clients) as clients, (SELECT COUNT(*) FROM sales) as sales, (SELECT COUNT(*) FROM movements) as movements');
  console.log('Counts:', counts[0]);
  db.close();
}
main().catch((e) => {
  console.error(e);
  db.close();
  process.exit(1);
});
