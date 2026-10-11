// Database script: creates + seeds the SQLite database, then assembles dist/ for Netlify.
const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE partners(id INTEGER PRIMARY KEY, name TEXT, kind TEXT);
    CREATE TABLE products(id INTEGER PRIMARY KEY, sku TEXT, name TEXT, icon TEXT, uom TEXT,
                          tracking TEXT, price REAL, stock INTEGER DEFAULT 0);
    CREATE TABLE moves(id INTEGER PRIMARY KEY, type TEXT, partner_id INTEGER, product_id INTEGER,
                       qty INTEGER, status TEXT DEFAULT 'draft', created TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
  const partners = [
    ['Karachi Wholesale Traders','vendor'],
    ['Indus Tech Distribution','vendor'],
    ['Lahore Electronics Supply','vendor'],
    ['Falcon Retail Store','customer'],
    ['Bahria Gadget Mart','customer'],
    ['Campus Tech Hub','customer']
  ];
  partners.forEach(p => db.run('INSERT INTO partners(name,kind) VALUES(?,?)', p));
  const products = [
    ['TAB-001','Tablet Pro 11"','📱','Units','Serial',88000],
    ['SSD-002','1TB NVMe SSD','💾','Units','Serial',26500],
    ['ROU-003','Wi-Fi 6 Router','🌐','Units','Serial',15800],
    ['MIC-004','Studio Microphone','🎙️','Units','None',13500],
    ['SPK-005','Bluetooth Speaker','🔊','Units','None',6200],
    ['BNK-006','Fast Power Bank 20k','🔋','Units','Lots',4800],
    ['CAB-007','Thunderbolt 4 Cable','⚡','Units','Lots',2900],
    ['PAD-008','RGB Desk Mat','🎴','Units','None',2100]
  ];
  products.forEach(p => db.run('INSERT INTO products(sku,name,icon,uom,tracking,price) VALUES(?,?,?,?,?,?)', p));
  // opening validated receipts and deliveries
  [[1,1,1,45],[1,2,2,280],[1,3,3,110],[1,1,4,50],[1,2,5,95],[1,3,6,200],[1,3,7,350],[1,2,8,420],
   [2,4,1,15],[2,5,2,85],[2,6,8,110],[2,4,5,20]].forEach(([t,p,pr,q]) =>
    db.run("INSERT INTO moves(type,partner_id,product_id,qty,status) VALUES(?,?,?,?,'done')", [t===1?'receipt':'delivery', p, pr, q]));
  // stock is derived from validated moves
  db.run(`UPDATE products SET stock=(SELECT COALESCE(SUM(CASE type WHEN 'receipt' THEN qty ELSE -qty END),0)
          FROM moves WHERE product_id=products.id AND status='done')`);

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/inventory.db', Buffer.from(db.export()));
  fs.copyFileSync('index.html', 'dist/index.html');
  // embedded copy so the site also works when index.html is opened by double-click
  const js = 'window.DB_B64="' + Buffer.from(db.export()).toString('base64') + '";';
  fs.writeFileSync('dist/inventory-data.js', js);
  fs.writeFileSync('inventory-data.js', js);
  fs.writeFileSync('inventory.db', Buffer.from(db.export()));

  // Fallback for Vercel default output directory
  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/inventory.db', Buffer.from(db.export()));
  fs.copyFileSync('index.html', 'public/index.html');
  fs.writeFileSync('public/inventory-data.js', js);

  const n = db.exec('SELECT COUNT(*), SUM(stock) FROM products')[0].values[0];
  console.log(`Database built: ${n[0]} products, ${n[1]} units in stock -> dist/ and public/`);
})();
