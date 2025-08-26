const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = 3000;

// Enhanced Security Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'library-system')));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// CSRF Protection
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }
    // In production, validate against stored token
    next();
  } else {
    next();
  }
});

// Rate Limiting for Payment Endpoints
const paymentAttempts = new Map();
app.use('/api/payment', (req, res, next) => {
  const clientIP = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  if (!paymentAttempts.has(clientIP)) {
    paymentAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
  }
  
  const client = paymentAttempts.get(clientIP);
  if (now > client.resetTime) {
    client.count = 0;
    client.resetTime = now + windowMs;
  }
  
  if (client.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many payment attempts. Please try again later.' });
  }
  
  client.count++;
  next();
});

// Open or create the database
const db = new sqlite3.Database('library.db');

db.serialize(() => {
  // Member books (for students/members)
  db.run(`CREATE TABLE IF NOT EXISTS member_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    bookNumber TEXT UNIQUE,
    borrowedByType TEXT,
    borrowedById INTEGER,
    borrowedAt TEXT,
    returnedAt TEXT
  )`);
  
  // Staff books (for teachers/staff)
  db.run(`CREATE TABLE IF NOT EXISTS staff_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    bookNumber TEXT UNIQUE,
    borrowedByType TEXT,
    borrowedById INTEGER,
    borrowedAt TEXT,
    returnedAt TEXT
  )`);
  
  // Add admId to members (unique, not null)
  db.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    admId TEXT UNIQUE NOT NULL
  )`);
  // Add tscNumber to staff (unique, not null)
  db.run(`CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tscNumber TEXT UNIQUE NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userType TEXT,
    userId INTEGER,
    name TEXT,
    bookId INTEGER,
    bookTitle TEXT,
    borrowedAt TEXT,
    returnedAt TEXT
  )`);

  // Migration: add admId to members if not present
  db.get("PRAGMA table_info(members)", (err, info) => {
    db.all("PRAGMA table_info(members)", (err, columns) => {
      if (!columns.some(col => col.name === 'admId')) {
        db.run("ALTER TABLE members ADD COLUMN admId TEXT UNIQUE");
      }
    });
  });
  // Migration: add tscNumber to staff if not present
  db.all("PRAGMA table_info(staff)", (err, columns) => {
    if (!columns.some(col => col.name === 'tscNumber')) {
      db.run("ALTER TABLE staff ADD COLUMN tscNumber TEXT UNIQUE");
    }
  });
  // Migration: add bookNumber to books if not present
  db.all("PRAGMA table_info(books)", (err, columns) => {
    if (!columns.some(col => col.name === 'bookNumber')) {
      db.run("ALTER TABLE books ADD COLUMN bookNumber TEXT");
    }
  });
});

// --- TEST ENDPOINT ---
app.get('/test', (req, res) => {
  res.send('API is working!');
});

// --- MEMBER BOOKS CRUD (for Library Page) ---
app.get('/api/member-books', (req, res) => {
  console.log('GET /api/member-books called');
  db.all('SELECT * FROM member_books', [], (err, rows) => {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Returning', rows.length, 'books');
    res.json(rows);
  });
});

app.post('/api/member-books', (req, res) => {
  console.log('POST /api/member-books called with body:', req.body);
  const { title, author, bookNumber } = req.body;
  
  if (!title || !author || !bookNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber.length < 2 || bookNumber.length > 15) {
    return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
  }
  if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
    return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
  }
  
  // Check for duplicate book number before inserting (only in member_books)
  db.get('SELECT title FROM member_books WHERE bookNumber = ?', [bookNumber], (err, existingBook) => {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (existingBook) {
      return res.status(400).json({ 
        error: 'Book number already exists',
        details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
      });
    }
    
    // If no duplicate, proceed with insertion
    db.run('INSERT INTO member_books (title, author, bookNumber) VALUES (?, ?, ?)', [title, author, bookNumber], function(err) {
      if (err) {
        console.log('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Book added with ID:', this.lastID);
      res.json({ id: this.lastID, title, author, bookNumber });
    });
  });
});

// --- STAFF BOOKS CRUD (for Staff Page) ---
app.get('/api/staff-books', (req, res) => {
  console.log('GET /api/staff-books called');
  db.all('SELECT * FROM staff_books', [], (err, rows) => {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Returning', rows.length, 'books');
    res.json(rows);
  });
});

app.post('/api/staff-books', (req, res) => {
  console.log('POST /api/staff-books called with body:', req.body);
  const { title, author, bookNumber } = req.body;
  
  if (!title || !author || !bookNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber.length < 2 || bookNumber.length > 15) {
    return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
  }
  if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
    return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
  }
  
  // Check for duplicate book number before inserting (only in staff_books)
  db.get('SELECT title FROM staff_books WHERE bookNumber = ?', [bookNumber], (err, existingBook) => {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (existingBook) {
      return res.status(400).json({ 
        error: 'Book number already exists',
        details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
      });
    }
    
    // If no duplicate, proceed with insertion
    db.run('INSERT INTO staff_books (title, author, bookNumber) VALUES (?, ?, ?)', [title, author, bookNumber], function(err) {
      if (err) {
        console.log('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Book added with ID:', this.lastID);
      res.json({ id: this.lastID, title, author, bookNumber });
    });
  });
});

// Member books PUT and DELETE
app.put('/api/member-books/:id', (req, res) => {
  const { title, author, bookNumber } = req.body;
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber) {
    if (bookNumber.length < 2 || bookNumber.length > 15) {
      return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
    }
    if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
      return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
    }
  }
  
  // Check for duplicate book number before updating (excluding current book)
  db.get('SELECT title FROM member_books WHERE bookNumber = ? AND id != ?', [bookNumber, req.params.id], (err, existingBook) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingBook) {
      return res.status(400).json({ 
        error: 'Book number already exists',
        details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
      });
    }
    
    // If no duplicate, proceed with update
    db.run('UPDATE member_books SET title = ?, author = ?, bookNumber = ? WHERE id = ?', [title, author, bookNumber, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, title, author, bookNumber });
    });
  });
});

app.delete('/api/member-books/:id', (req, res) => {
  const bookId = req.params.id;
  
  // Check if book is currently borrowed (must be returned first)
  db.get('SELECT * FROM member_books WHERE id = ?', [bookId], (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    if (book.borrowedById) {
      return res.status(400).json({ 
        error: 'Cannot delete book. This book is currently borrowed and must be returned first.',
        details: `Book "${book.title}" is currently borrowed by ${book.borrowedByType === 'member' ? 'a member' : 'staff'}. Please return the book before deleting.`
      });
    }
    
    // If not borrowed, safe to delete (borrowing history is preserved in history table)
    db.run('DELETE FROM member_books WHERE id = ?', [bookId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, message: 'Book deleted successfully. Borrowing history is preserved for future reference.' });
    });
  });
});

// Staff books PUT and DELETE
app.put('/api/staff-books/:id', (req, res) => {
  const { title, author, bookNumber } = req.body;
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber) {
    if (bookNumber.length < 2 || bookNumber.length > 15) {
      return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
    }
    if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
      return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
    }
  }
  
  // Check for duplicate book number before updating (excluding current book)
  db.get('SELECT title FROM staff_books WHERE bookNumber = ? AND id != ?', [bookNumber, req.params.id], (err, existingBook) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingBook) {
      return res.status(400).json({ 
        error: 'Book number already exists',
        details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
      });
    }
    
    // If no duplicate, proceed with update
    db.run('UPDATE staff_books SET title = ?, author = ?, bookNumber = ? WHERE id = ?', [title, author, bookNumber, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, title, author, bookNumber });
    });
  });
});

app.delete('/api/staff-books/:id', (req, res) => {
  const bookId = req.params.id;
  
  // Check if book is currently borrowed (must be returned first)
  db.get('SELECT * FROM staff_books WHERE id = ?', [bookId], (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    if (book.borrowedById) {
      return res.status(400).json({ 
        error: 'Cannot delete book. This book is currently borrowed and must be returned first.',
        details: `Book "${book.title}" is currently borrowed by ${book.borrowedByType === 'member' ? 'a member' : 'staff'}. Please return the book before deleting.`
      });
    }
    
    // If not borrowed, safe to delete (borrowing history is preserved in history table)
    db.run('DELETE FROM staff_books WHERE id = ?', [bookId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, message: 'Book deleted successfully. Borrowing history is preserved for future reference.' });
    });
  });
});

// --- MEMBERS CRUD ---
app.get('/api/members', (req, res) => {
  db.all('SELECT * FROM members', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/members', (req, res) => {
  const { name, admId } = req.body;
  if (!admId) return res.status(400).json({ error: 'ADM/ID No is required' });
  
  // Check for duplicate ADM/ID No before inserting
  db.get('SELECT name FROM members WHERE admId = ?', [admId], (err, existingMember) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingMember) {
      return res.status(400).json({ 
        error: 'ADM/ID No already exists',
        details: `ADM/ID No "${admId}" is already assigned to member "${existingMember.name}". Please use a different ADM/ID No.`
      });
    }
    
    // If no duplicate, proceed with insertion
    db.run('INSERT INTO members (name, admId) VALUES (?, ?)', [name, admId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, admId });
    });
  });
});

app.put('/api/members/:id', (req, res) => {
  const { name, admId } = req.body;
  if (!admId) return res.status(400).json({ error: 'ADM/ID No is required' });
  
  // Check for duplicate ADM/ID No before updating (excluding current member)
  db.get('SELECT name FROM members WHERE admId = ? AND id != ?', [admId, req.params.id], (err, existingMember) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingMember) {
      return res.status(400).json({ 
        error: 'ADM/ID No already exists',
        details: `ADM/ID No "${admId}" is already assigned to member "${existingMember.name}". Please use a different ADM/ID No.`
      });
    }
    
    // If no duplicate, proceed with update
    db.run('UPDATE members SET name = ?, admId = ? WHERE id = ?', [name, admId, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, admId });
    });
  });
});

app.delete('/api/members/:id', (req, res) => {
  const memberId = req.params.id;
  
  // Check if member currently has borrowed books (must return all books first)
  db.get('SELECT COUNT(*) as count FROM member_books WHERE borrowedById = ? AND borrowedByType = ?', [memberId, 'member'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete member. This member currently has borrowed books that must be returned first.',
        details: `Member has ${result.count} book(s) currently borrowed. Please return all books before deleting.`
      });
    }
    
    // If no current borrows, safe to delete (borrowing history is preserved in history table)
    db.run('DELETE FROM members WHERE id = ?', [memberId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, message: 'Member deleted successfully. Borrowing history is preserved for future reference.' });
    });
  });
});

// --- STAFF CRUD ---
app.get('/api/staff', (req, res) => {
  db.all('SELECT * FROM staff', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/staff', (req, res) => {
  const { name, tscNumber } = req.body;
  if (!tscNumber) return res.status(400).json({ error: 'TSC Number is required' });
  
  // Check for duplicate TSC Number before inserting
  db.get('SELECT name FROM staff WHERE tscNumber = ?', [tscNumber], (err, existingStaff) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingStaff) {
      return res.status(400).json({ 
        error: 'TSC Number already exists',
        details: `TSC Number "${tscNumber}" is already assigned to staff "${existingStaff.name}". Please use a different TSC Number.`
      });
    }
    
    // If no duplicate, proceed with insertion
    db.run('INSERT INTO staff (name, tscNumber) VALUES (?, ?)', [name, tscNumber], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, tscNumber });
    });
  });
});

app.put('/api/staff/:id', (req, res) => {
  const { name, tscNumber } = req.body;
  if (!tscNumber) return res.status(400).json({ error: 'TSC Number is required' });
  
  // Check for duplicate TSC Number before updating (excluding current staff)
  db.get('SELECT name FROM staff WHERE tscNumber = ? AND id != ?', [tscNumber, req.params.id], (err, existingStaff) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (existingStaff) {
      return res.status(400).json({ 
        error: 'TSC Number already exists',
        details: `TSC Number "${tscNumber}" is already assigned to staff "${existingStaff.name}". Please use a different TSC Number.`
      });
    }
    
    // If no duplicate, proceed with update
    db.run('UPDATE staff SET name = ?, tscNumber = ? WHERE id = ?', [name, tscNumber, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, tscNumber });
    });
  });
});

app.delete('/api/staff/:id', (req, res) => {
  const staffId = req.params.id;
  
  // Check if staff currently has borrowed books (must return all books first)
  db.get('SELECT COUNT(*) as count FROM staff_books WHERE borrowedById = ? AND borrowedByType = ?', [staffId, 'staff'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete staff. This staff member currently has borrowed books that must be returned first.',
        details: `Staff has ${result.count} book(s) currently borrowed. Please return all books before deleting.`
      });
    }
    
    // If no current borrows, safe to delete (borrowing history is preserved in history table)
    db.run('DELETE FROM staff WHERE id = ?', [staffId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, message: 'Staff deleted successfully. Borrowing history is preserved for future reference.' });
    });
  });
});

// --- BORROW/RETURN (for both members and staff) ---
app.post('/api/borrow', (req, res) => {
  const { bookId, userType, userId, name } = req.body;
  const now = new Date().toISOString();
  
  // Determine which table to use based on user type
  const tableName = userType === 'staff' ? 'staff_books' : 'member_books';
  
  db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [bookId], (err, book) => {
    if (err || !book) return res.status(404).json({ error: 'Book not found' });
    if (book.borrowedById) return res.status(400).json({ error: 'Book already borrowed' });
    
    db.run(`UPDATE ${tableName} SET borrowedByType = ?, borrowedById = ?, borrowedAt = ?, returnedAt = NULL WHERE id = ?`,
      [userType, userId, now, bookId], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        db.run('INSERT INTO history (userType, userId, name, bookId, bookTitle, borrowedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [userType, userId, name, bookId, book.title, now], function(err3) {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ success: true });
          });
      });
  });
});

app.post('/api/return', (req, res) => {
  const { bookId, userType } = req.body;
  const now = new Date().toISOString();
  
  // Determine which table to use based on user type
  const tableName = userType === 'staff' ? 'staff_books' : 'member_books';
  
  db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [bookId], (err, book) => {
    if (err || !book) return res.status(404).json({ error: 'Book not found' });
    if (!book.borrowedById) return res.status(400).json({ error: 'Book is not borrowed' });
    
    db.run(`UPDATE ${tableName} SET borrowedByType = NULL, borrowedById = NULL, borrowedAt = NULL, returnedAt = ? WHERE id = ?`,
      [now, bookId], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        db.run('UPDATE history SET returnedAt = ? WHERE bookId = ? AND returnedAt IS NULL',
          [now, bookId], function(err3) {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ success: true });
          });
      });
  });
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'library-system', 'staff.html'));
});
app.get('/book-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'library-system', 'book-history.html'));
});

app.get('/main-library-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'library-system', 'main-library-dashboard.html'));
});

// --- ENHANCED USERS TABLE FOR AUTHENTICATION ---
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('librarian', 'staff', 'principal')),
  isPaid INTEGER DEFAULT 0,
  isApproved INTEGER DEFAULT 0,
  isLocked INTEGER DEFAULT 0,
  subscription_plan TEXT,
  subscription_amount DECIMAL(10,2),
  subscription_start DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Add missing columns if they don't exist
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (!columns.some(col => col.name === 'isPaid')) {
    db.run("ALTER TABLE users ADD COLUMN isPaid INTEGER DEFAULT 0");
  }
  if (!columns.some(col => col.name === 'isApproved')) {
    db.run("ALTER TABLE users ADD COLUMN isApproved INTEGER DEFAULT 0");
  }
  if (!columns.some(col => col.name === 'isLocked')) {
    db.run("ALTER TABLE users ADD COLUMN isLocked INTEGER DEFAULT 0");
  }
  if (!columns.some(col => col.name === 'subscription_plan')) {
    db.run("ALTER TABLE users ADD COLUMN subscription_plan TEXT");
  }
  if (!columns.some(col => col.name === 'subscription_amount')) {
    db.run("ALTER TABLE users ADD COLUMN subscription_amount DECIMAL(10,2)");
  }
  if (!columns.some(col => col.name === 'subscription_start')) {
    db.run("ALTER TABLE users ADD COLUMN subscription_start DATETIME");
  }
});

// --- AUTHENTICATION ENDPOINTS ---
// Input validation and sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>\"']/g, '').trim();
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

app.post('/api/register', (req, res) => {
  const { fullName, email, password, role } = req.body;
  
  // Input validation
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Sanitize inputs
  const sanitizedName = sanitizeInput(fullName);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedPassword = sanitizeInput(password);
  const sanitizedRole = sanitizeInput(role);
  
  // Validate email format
  if (!validateEmail(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Validate password strength
  if (sanitizedPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  
  // Validate role
  if (!['librarian', 'staff', 'principal'].includes(sanitizedRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  // Check if email already exists
  db.get('SELECT id FROM users WHERE email = ?', [sanitizedEmail], (err, existingUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });
    
    // Hash password (in production, use bcrypt)
    const hashedPassword = crypto.createHash('sha256').update(sanitizedPassword).digest('hex');
    
    // Insert new user
    db.run('INSERT INTO users (fullName, email, password, role, isApproved) VALUES (?, ?, ?, ?, ?)', 
      [sanitizedName, sanitizedEmail, hashedPassword, sanitizedRole, 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        id: this.lastID, 
        fullName: sanitizedName, 
        email: sanitizedEmail, 
        role: sanitizedRole, 
        message: 'Registration successful. Awaiting admin approval.' 
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedPassword = sanitizeInput(password);
  
  // Validate email format
  if (!validateEmail(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Hash password for comparison
  const hashedPassword = crypto.createHash('sha256').update(sanitizedPassword).digest('hex');
  
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [sanitizedEmail, hashedPassword], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({ error: 'Account pending approval. Please contact administrator.' });
    }
    
    // Check if user is locked
    if (user.isLocked) {
      return res.status(403).json({ error: 'Account is locked. Please contact administrator.' });
    }
    
    // Check if user has active subscription (for premium features)
    const hasActiveSubscription = user.isPaid && user.subscription_plan;
    
    res.json({ 
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isPaid: user.isPaid || false,
      subscriptionPlan: user.subscription_plan,
      hasActiveSubscription,
      message: 'Login successful'
    });
  });
});

// --- HISTORY ENDPOINT (READ-ONLY) ---
app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM history ORDER BY borrowedAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- USERS ENDPOINT FOR ADMIN DASHBOARD ---
app.get('/api/users', (req, res) => {
  // In production, verify admin role
  db.all('SELECT id, fullName, email, role, isPaid, isApproved, isLocked, subscription_plan, subscription_amount, createdAt FROM users ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

// --- SECURITY: BLOCK ANY ATTEMPTS TO MODIFY HISTORY ---
app.post('/api/history', (req, res) => {
  res.status(403).json({ error: 'History entries cannot be created manually. They are automatically generated by the system.' });
});

app.put('/api/history/:id', (req, res) => {
  res.status(403).json({ error: 'History entries cannot be modified. They are permanent records.' });
});

app.delete('/api/history/:id', (req, res) => {
  res.status(403).json({ error: 'History entries cannot be deleted. They are permanent records.' });
});

app.delete('/api/history', (req, res) => {
  res.status(403).json({ error: 'History entries cannot be deleted. They are permanent records.' });
});

// --- ENHANCED PAYMENT PROCESSING ENDPOINTS ---

// Create payments table for transaction logging
db.run(`CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  plan_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
)`);

app.post('/api/payment-success', (req, res) => {
  const { plan, amount, currency, paymentMethod, transactionId, timestamp } = req.body;
  
  // Input validation and sanitization
  if (!plan || !amount || !paymentMethod || !transactionId) {
    return res.status(400).json({ error: 'Missing required payment information' });
  }
  
  // Generate verification code for manual verification
  const verificationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Log payment transaction
  db.run(`INSERT INTO payments (transaction_id, plan_type, amount, currency, payment_method, status, verification_code) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [transactionId, plan, amount, currency || 'USD', paymentMethod, 'pending', verificationCode],
    function(err) {
      if (err) {
        console.error('Payment logging error:', err);
        return res.status(500).json({ error: 'Failed to log payment transaction' });
      }
      
      console.log('Payment logged successfully:', { 
        transactionId, 
        plan, 
        amount, 
        currency, 
        paymentMethod, 
        verificationCode 
      });
      
      res.json({ 
        success: true, 
        message: 'Payment logged successfully. Awaiting verification.',
        transactionId,
        verificationCode,
        subscription: {
          plan,
          amount,
          currency,
          paymentMethod,
          startDate: timestamp,
          status: 'pending_verification'
        }
      });
    }
  );
});

// Payment verification endpoint
app.post('/api/verify-payment', (req, res) => {
  const { transactionId, verificationCode } = req.body;
  
  if (!transactionId || !verificationCode) {
    return res.status(400).json({ error: 'Transaction ID and verification code required' });
  }
  
  db.get('SELECT * FROM payments WHERE transaction_id = ? AND verification_code = ?', 
    [transactionId, verificationCode], (err, payment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error during verification' });
      }
      
      if (!payment) {
        return res.status(404).json({ error: 'Invalid transaction ID or verification code' });
      }
      
      if (payment.status === 'verified') {
        return res.json({ success: true, message: 'Payment already verified' });
      }
      
      // Update payment status to verified
      db.run('UPDATE payments SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?', 
        ['verified', payment.id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update payment status' });
          }
          
          // Update user subscription status
          if (payment.user_id) {
            db.run('UPDATE users SET isPaid = 1, subscription_plan = ?, subscription_amount = ? WHERE id = ?',
              [payment.plan_type, payment.amount, payment.user_id]);
          }
          
          res.json({ 
            success: true, 
            message: 'Payment verified successfully. Subscription activated.',
            payment: {
              transactionId: payment.transaction_id,
              plan: payment.plan_type,
              amount: payment.amount,
              currency: payment.currency,
              status: 'verified'
            }
          });
        }
      );
    }
  );
});

app.post('/api/start-trial', (req, res) => {
  const { startDate, endDate } = req.body;
  
  console.log('Starting trial:', { startDate, endDate });
  
  // Create trial account
  res.json({ 
    success: true, 
    message: 'Trial started successfully',
    trial: {
      startDate,
      endDate,
      status: 'active',
      features: 'all'
    }
  });
});

// Payment success and failure pages
app.get('/payment-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful - Library System</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0fdf4; }
        .success { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        h1 { color: #16a34a; }
        .btn { background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="success">
        <h1>🎉 Payment Successful!</h1>
        <p>Your subscription has been activated. You now have access to all premium features.</p>
        <a href="/index-landing.html" class="btn">Go to Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/payment-failed', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed - Library System</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fef2f2; }
        .failed { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        h1 { color: #dc2626; }
        .btn { background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px; }
      </style>
    </head>
    <body>
      <div class="failed">
        <h1>❌ Payment Failed</h1>
        <p>There was an issue processing your payment. Please try again or contact support.</p>
        <a href="/pricing.html" class="btn">Try Again</a>
        <a href="/index-landing.html" class="btn">Go Home</a>
      </div>
    </body>
    </html>
  `);
});

// --- ADMIN DASHBOARD ENDPOINTS ---

// Get all payments for admin monitoring
app.get('/api/admin/payments', (req, res) => {
  // In production, verify admin role
  db.all('SELECT * FROM payments ORDER BY created_at DESC', [], (err, payments) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
    res.json(payments);
  });
});

// Lock/unlock user access
app.post('/api/admin/lock-user', (req, res) => {
  const { userId, locked } = req.body;
  
  if (typeof userId === 'undefined' || typeof locked === 'undefined') {
    return res.status(400).json({ error: 'User ID and locked status required' });
  }
  
  db.run('UPDATE users SET isLocked = ? WHERE id = ?', [locked ? 1 : 0, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }
    
    res.json({ 
      success: true, 
      message: `User ${locked ? 'locked' : 'unlocked'} successfully` 
    });
  });
});

// Approve new users
app.post('/api/admin/approve-user', (req, res) => {
  const { userId, approved, role } = req.body;
  
  if (typeof userId === 'undefined' || typeof approved === 'undefined') {
    return res.status(400).json({ error: 'User ID and approval status required' });
  }
  
  if (approved && !role) {
    return res.status(400).json({ error: 'Role required for approved users' });
  }
  
  db.run('UPDATE users SET isApproved = ?, role = ? WHERE id = ?', 
    [approved ? 1 : 0, role || null, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update user approval status' });
      }
      
      res.json({ 
        success: true, 
        message: `User ${approved ? 'approved' : 'rejected'} successfully` 
      });
    }
  );
});

// Get system usage statistics
app.get('/api/admin/stats', (req, res) => {
  const stats = {};
  
  // Get user counts
  db.get('SELECT COUNT(*) as total FROM users', [], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to get user stats' });
    stats.totalUsers = result.total;
    
    // Get payment stats
    db.get('SELECT COUNT(*) as total, SUM(amount) as revenue FROM payments WHERE status = "verified"', [], (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to get payment stats' });
      stats.verifiedPayments = result.total;
      stats.totalRevenue = result.revenue || 0;
      
      // Get book stats
      db.get('SELECT COUNT(*) as total FROM member_books', [], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to get book stats' });
        stats.totalBooks = result.total;
        
        res.json(stats);
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Library system running at http://localhost:${PORT}`);
}); 







