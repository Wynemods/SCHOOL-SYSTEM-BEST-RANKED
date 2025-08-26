const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'library-system')));

// Open or create the database
const db = new sqlite3.Database('library.db');

db.serialize(() => {
  // Member books (for students/members)
  db.run(`CREATE TABLE IF NOT EXISTS member_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    bookNumber TEXT UNIQUE,
    subject TEXT,
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
    subject TEXT,
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
  const { title, author, bookNumber, subject } = req.body;
  
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
    db.run('INSERT INTO member_books (title, author, bookNumber, subject) VALUES (?, ?, ?, ?)', [title, author, bookNumber, subject], function(err) {
      if (err) {
        console.log('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Book added with ID:', this.lastID);
      res.json({ id: this.lastID, title, author, bookNumber, subject });
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
  const { title, author, bookNumber, subject } = req.body;
  
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
    db.run('INSERT INTO staff_books (title, author, bookNumber, subject) VALUES (?, ?, ?, ?)', [title, author, bookNumber, subject], function(err) {
      if (err) {
        console.log('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Book added with ID:', this.lastID);
      res.json({ id: this.lastID, title, author, bookNumber, subject });
    });
  });
});

// Member books PUT and DELETE
app.put('/api/member-books/:id', (req, res) => {
  const { title, author, bookNumber, subject } = req.body;
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber.length < 2 || bookNumber.length > 15) {
    return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
  }
  if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
    return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
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
    db.run('UPDATE member_books SET title = ?, author = ?, bookNumber = ?, subject = ? WHERE id = ?', [title, author, bookNumber, subject, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, title, author, bookNumber, subject });
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
  const { title, author, bookNumber, subject } = req.body;
  
  // Validate book number (2-15 characters, letters, numbers, and common separators)
  if (bookNumber.length < 2 || bookNumber.length > 15) {
    return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
  }
  if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
    return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
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
    db.run('UPDATE staff_books SET title = ?, author = ?, bookNumber = ?, subject = ? WHERE id = ?', [title, author, bookNumber, subject, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, title, author, bookNumber, subject });
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

app.get('/library-system', (req, res) => {
  res.sendFile(path.join(__dirname, 'library-system', 'library-system-page.html'));
});

// --- HISTORY ENDPOINT (READ-ONLY) ---
app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM history ORDER BY borrowedAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
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

app.listen(PORT, () => {
  console.log(`Library system running at http://localhost:${PORT}`);
}); 