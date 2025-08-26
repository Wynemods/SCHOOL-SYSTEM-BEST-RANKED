const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const db = new sqlite3.Database('library.db');

console.log('Adding demo users to database...');

const demoUsers = [
  {
    fullName: 'Demo Librarian',
    email: 'librarian@school.com',
    password: 'password123',
    role: 'librarian'
  },
  {
    fullName: 'Demo Staff',
    email: 'staff@school.com',
    password: 'password123',
    role: 'staff'
  },
  {
    fullName: 'Demo Principal',
    email: 'principal@school.com',
    password: 'password123',
    role: 'principal'
  }
];

// Hash password function (same as server.js)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Check if demo users already exist
db.all('SELECT email FROM users WHERE email IN (?, ?, ?)', 
  ['librarian@school.com', 'staff@school.com', 'principal@school.com'], 
  (err, existingUsers) => {
    if (err) {
      console.error('Error checking existing users:', err);
      db.close();
      return;
    }
    
    const existingEmails = existingUsers.map(u => u.email);
    const usersToAdd = demoUsers.filter(user => !existingEmails.includes(user.email));
    
    if (usersToAdd.length === 0) {
      console.log('All demo users already exist in database.');
      
      // Update existing demo users to be approved
      db.run('UPDATE users SET isApproved = 1 WHERE email IN (?, ?, ?)', 
        ['librarian@school.com', 'staff@school.com', 'principal@school.com'],
        function(err) {
          if (err) {
            console.error('Error updating demo users:', err);
          } else {
            console.log('Demo users approved successfully.');
          }
          db.close();
        }
      );
    } else {
      // Add new demo users
      const stmt = db.prepare('INSERT INTO users (fullName, email, password, role, isApproved) VALUES (?, ?, ?, ?, 1)');
      
      usersToAdd.forEach(user => {
        const hashedPassword = hashPassword(user.password);
        stmt.run(user.fullName, user.email, hashedPassword, user.role);
        console.log(`Added demo user: ${user.email}`);
      });
      
      stmt.finalize((err) => {
        if (err) {
          console.error('Error adding demo users:', err);
        } else {
          console.log('Demo users added and approved successfully.');
        }
        db.close();
      });
    }
  }
);
