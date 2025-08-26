const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('library.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('--- STAFF TABLE SCHEMA ---');
  db.all('PRAGMA table_info(staff)', (err, columns) => {
    if (err) {
      console.error('Schema error:', err.message);
      db.close();
      process.exit(1);
    }
    if (!columns || columns.length === 0) {
      console.error('No columns found. Table may not exist.');
      db.close();
      process.exit(1);
    }
    columns.forEach(col => console.log(col));
    console.log('--- FIRST 10 ROWS ---');
    db.all('SELECT * FROM staff LIMIT 10', (err2, rows) => {
      if (err2) {
        console.error('Row error:', err2.message);
        db.close();
        process.exit(1);
      }
      if (!rows || rows.length === 0) {
        console.log('No rows found in staff table.');
      } else {
        rows.forEach(row => console.log(row));
      }
      db.close();
    });
  });
}); 