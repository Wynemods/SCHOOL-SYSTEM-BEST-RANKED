const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('library.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error listing tables:', err.message);
      db.close();
      process.exit(1);
    }
    if (!tables || tables.length === 0) {
      console.log('No tables found in database.');
    } else {
      console.log('Tables in database:');
      tables.forEach(t => console.log(t.name));
    }
    db.close();
  });
}); 