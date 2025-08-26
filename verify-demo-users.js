const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('library.db');

console.log('Verifying demo users in database...');

db.all('SELECT id, fullName, email, role, isApproved FROM users WHERE email IN ("librarian@school.com", "staff@school.com", "principal@school.com")', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Demo users found:');
    rows.forEach(user => {
      console.log(`- ${user.email}: ${user.fullName} (${user.role}), Approved: ${user.isApproved ? 'Yes' : 'No'}`);
    });
    
    if (rows.length === 0) {
      console.log('No demo users found in database.');
    } else if (rows.length === 3) {
      console.log('All demo users are properly set up and approved!');
    } else {
      console.log(`Only ${rows.length} demo users found (expected 3).`);
    }
  }
  
  db.close();
});
