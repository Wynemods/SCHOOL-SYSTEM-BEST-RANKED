const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('library.db');

console.log('Checking for demo users in database...');

// Check if demo users exist
db.all('SELECT * FROM users WHERE email IN ("librarian@school.com", "staff@school.com", "principal@school.com")', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Demo users found:', rows);
    
    if (rows.length === 0) {
      console.log('No demo users found in database. They only exist in localStorage.');
    } else {
      console.log('Demo users exist in database with approval status:', rows.map(u => ({email: u.email, isApproved: u.isApproved})));
    }
  }
  
  db.close();
});
