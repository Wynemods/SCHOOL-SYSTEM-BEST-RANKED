const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load school configuration
const configPath = path.join(__dirname, 'school-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Database setup
const dbPath = path.join(__dirname, config.databasePath);
const db = new sqlite3.Database(dbPath);

// Middleware
app.use(express.json());
app.use(express.static('library-system'));

// Create tables if they don't exist
db.serialize(() => {
    // Books table
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        bookNumber TEXT UNIQUE,
        isbn TEXT,
        borrowedById INTEGER,
        borrowedByType TEXT,
        borrowedAt TEXT
    )`);
    
    // Members table
    db.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )`);
    
    // Staff table
    db.run(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )`);
    
    // History table
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER,
        bookTitle TEXT,
        userId INTEGER,
        userName TEXT,
        userType TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Migration: add bookNumber to books if not present
    db.all("PRAGMA table_info(books)", (err, columns) => {
        if (!columns.some(col => col.name === 'bookNumber')) {
            db.run("ALTER TABLE books ADD COLUMN bookNumber TEXT");
        }
    });
});

// API Routes
app.get('/api/books', (req, res) => {
    db.all('SELECT * FROM books ORDER BY title', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/books', (req, res) => {
    const { title, author, bookNumber, isbn } = req.body;
    
    // Validate book number (2-15 characters, letters, numbers, and common separators)
    if (bookNumber) {
        if (bookNumber.length < 2 || bookNumber.length > 15) {
            return res.status(400).json({ error: 'Book number must be between 2 and 15 characters' });
        }
        if (!/^[A-Za-z0-9\/\-_\.]+$/.test(bookNumber)) {
            return res.status(400).json({ error: 'Book number can only contain letters, numbers, and separators (/, -, _, .)' });
        }
    }
    
    // Check for duplicate book number before inserting
    db.get('SELECT title FROM books WHERE bookNumber = ?', [bookNumber], (err, existingBook) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (existingBook) {
            return res.status(400).json({ 
                error: 'Book number already exists',
                details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
            });
        }
        
        // If no duplicate, proceed with insertion
        db.run('INSERT INTO books (title, author, bookNumber, isbn) VALUES (?, ?, ?, ?)', 
            [title, author, bookNumber, isbn], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, title, author, bookNumber, isbn });
        });
    });
});

app.put('/api/books/:id', (req, res) => {
    const { title, author, bookNumber, isbn } = req.body;
    
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
    db.get('SELECT title FROM books WHERE bookNumber = ? AND id != ?', [bookNumber, req.params.id], (err, existingBook) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (existingBook) {
            return res.status(400).json({ 
                error: 'Book number already exists',
                details: `Book number "${bookNumber}" is already assigned to book "${existingBook.title}". Please use a different book number.`
            });
        }
        
        // If no duplicate, proceed with update
        db.run('UPDATE books SET title = ?, author = ?, bookNumber = ?, isbn = ? WHERE id = ?', 
            [title, author, bookNumber, isbn, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, title, author, bookNumber, isbn });
        });
    });
});

app.delete('/api/books/:id', (req, res) => {
    // Check if book is currently borrowed (must be returned first)
    db.get('SELECT borrowedById, title, borrowedByType FROM books WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row && row.borrowedById) {
            res.status(400).json({ 
                error: 'Cannot delete book. This book is currently borrowed and must be returned first.',
                details: `Book "${row.title}" is currently borrowed by ${row.borrowedByType === 'member' ? 'a member' : 'staff'}. Please return the book before deleting.`
            });
            return;
        }
        
        // If not borrowed, safe to delete (borrowing history is preserved in history table)
        db.run('DELETE FROM books WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Book deleted successfully. Borrowing history is preserved for future reference.' });
        });
    });
});

// Members API
app.get('/api/members', (req, res) => {
    db.all('SELECT * FROM members ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/members', (req, res) => {
    const { name, email, phone } = req.body;
    db.run('INSERT INTO members (name, email, phone) VALUES (?, ?, ?)',
        [name, email, phone], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, email, phone });
    });
});

app.put('/api/members/:id', (req, res) => {
    const { name, email, phone } = req.body;
    db.run('UPDATE members SET name = ?, email = ?, phone = ? WHERE id = ?',
        [name, email, phone, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: req.params.id, name, email, phone });
    });
});

app.delete('/api/members/:id', (req, res) => {
    // Check if member currently has borrowed books (must return all books first)
    db.get('SELECT COUNT(*) as count FROM books WHERE borrowedById = ? AND borrowedByType = "member"', 
        [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row.count > 0) {
            res.status(400).json({ 
                error: 'Cannot delete member. This member currently has borrowed books that must be returned first.',
                details: `Member has ${row.count} book(s) currently borrowed. Please return all books before deleting.`
            });
            return;
        }
        
        // If no current borrows, safe to delete (borrowing history is preserved in history table)
        db.run('DELETE FROM members WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Member deleted successfully. Borrowing history is preserved for future reference.' });
        });
    });
});

// Staff API
app.get('/api/staff', (req, res) => {
    db.all('SELECT * FROM staff ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/staff', (req, res) => {
    const { name, email, phone } = req.body;
    db.run('INSERT INTO staff (name, email, phone) VALUES (?, ?, ?)',
        [name, email, phone], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, email, phone });
    });
});

app.put('/api/staff/:id', (req, res) => {
    const { name, email, phone } = req.body;
    db.run('UPDATE staff SET name = ?, email = ?, phone = ? WHERE id = ?',
        [name, email, phone, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: req.params.id, name, email, phone });
    });
});

app.delete('/api/staff/:id', (req, res) => {
    // Check if staff currently has borrowed books (must return all books first)
    db.get('SELECT COUNT(*) as count FROM books WHERE borrowedById = ? AND borrowedByType = "staff"', 
        [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row.count > 0) {
            res.status(400).json({ 
                error: 'Cannot delete staff. This staff member currently has borrowed books that must be returned first.',
                details: `Staff has ${row.count} book(s) currently borrowed. Please return all books before deleting.`
            });
            return;
        }
        
        // If no current borrows, safe to delete (borrowing history is preserved in history table)
        db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Staff deleted successfully. Borrowing history is preserved for future reference.' });
        });
    });
});

// Borrow API
app.post('/api/borrow', (req, res) => {
    const { bookId, userType, userId, name } = req.body;
    
    db.run('UPDATE books SET borrowedById = ?, borrowedByType = ?, borrowedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [userId, userType, bookId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Log to history
        db.get('SELECT title FROM books WHERE id = ?', [bookId], (err, book) => {
            if (book) {
                db.run('INSERT INTO history (bookId, bookTitle, userId, userName, userType, action) VALUES (?, ?, ?, ?, ?, ?)',
                    [bookId, book.title, userId, name, userType, 'borrowed']);
            }
        });
        
        res.json({ message: 'Book borrowed successfully' });
    });
});

// Return API
app.post('/api/return', (req, res) => {
    const { bookIds } = req.body;
    
    if (!Array.isArray(bookIds)) {
        res.status(400).json({ error: 'bookIds must be an array' });
        return;
    }
    
    let completed = 0;
    const total = bookIds.length;
    
    bookIds.forEach(bookId => {
        db.get('SELECT title, borrowedById, borrowedByType FROM books WHERE id = ?', [bookId], (err, book) => {
            if (book && book.borrowedById) {
                // Get user name
                const table = book.borrowedByType === 'member' ? 'members' : 'staff';
                db.get(`SELECT name FROM ${table} WHERE id = ?`, [book.borrowedById], (err, user) => {
                    // Update book
                    db.run('UPDATE books SET borrowedById = NULL, borrowedByType = NULL, borrowedAt = NULL WHERE id = ?',
                        [bookId], function(err) {
                        if (!err) {
                            // Log to history
                            db.run('INSERT INTO history (bookId, bookTitle, userId, userName, userType, action) VALUES (?, ?, ?, ?, ?, ?)',
                                [bookId, book.title, book.borrowedById, user ? user.name : 'Unknown', book.borrowedByType, 'returned']);
                        }
                        
                        completed++;
                        if (completed === total) {
                            res.json({ message: 'Books returned successfully' });
                        }
                    });
                });
            } else {
                completed++;
                if (completed === total) {
                    res.json({ message: 'Books returned successfully' });
                }
            }
        });
    });
});

// History API (read-only)
app.get('/api/history', (req, res) => {
    db.all('SELECT * FROM history ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Block manual history modifications
app.post('/api/history', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

app.put('/api/history/:id', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

app.delete('/api/history/:id', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'index.html'));
});

// Serve staff page
app.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'staff.html'));
});

// Serve book history page
app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'book-history.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🏫 ${config.schoolName} Library System running at http://localhost:${PORT}`);
    console.log(`📊 Database: ${config.databasePath}`);
    console.log(`🏫 School Code: ${config.schoolCode}`);
});

module.exports = app;
