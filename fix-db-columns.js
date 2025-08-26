const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('library.db');

let completed = 0;
function done() {
  completed++;
  if (completed === 2) db.close();
}

function ensureColumn(table, column, type, cb) {
  db.all(`PRAGMA table_info(${table})`, (err, columns) => {
    if (err) return cb(err);
    if (!columns.some(col => col.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`,
        err2 => cb(err2));
    } else {
      cb();
    }
  });
}

function randomDigits(length) {
  let str = '';
  for (let i = 0; i < length; i++) str += Math.floor(Math.random() * 10);
  return str;
}

function randomAlphanum(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let str = '';
  for (let i = 0; i < length; i++) str += chars[Math.floor(Math.random() * chars.length)];
  return str;
}

db.serialize(() => {
  ensureColumn('members', 'admId', 'TEXT', err => {
    if (err) {
      console.error('Error ensuring admId column in members:', err.message);
      done();
    } else {
      db.all("SELECT id FROM members", (err2, rows) => {
        if (err2) {
          console.error('Error selecting members:', err2.message);
          done();
        } else {
          let updates = 0;
          if (rows.length === 0) return done();
          rows.forEach(row => {
            const newAdmId = randomAlphanum(6);
            db.run("UPDATE members SET admId = ? WHERE id = ?", [newAdmId, row.id], err3 => {
              if (err3) console.error('Error updating member admId:', err3.message);
              updates++;
              if (updates === rows.length) done();
            });
          });
        }
      });
    }
  });
  ensureColumn('staff', 'tscNumber', 'TEXT', err => {
    if (err) {
      console.error('Error ensuring tscNumber column in staff:', err.message);
      done();
    } else {
      db.all("SELECT id FROM staff WHERE tscNumber IS NULL", (err2, rows) => {
        if (err2) {
          console.error('Error selecting staff:', err2.message);
          done();
        } else {
          let updates = 0;
          if (rows.length === 0) return done();
          rows.forEach(row => {
            const newTsc = randomDigits(10);
            db.run("UPDATE staff SET tscNumber = ? WHERE id = ?", [newTsc, row.id], err3 => {
              if (err3) console.error('Error updating staff tscNumber:', err3.message);
              updates++;
              if (updates === rows.length) done();
            });
          });
        }
      });
    }
  });
}); 