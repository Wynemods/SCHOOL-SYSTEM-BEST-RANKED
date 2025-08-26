const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3002; // Use different port

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'library-system')));

// Database
const db = new sqlite3.Database('library.db');

// Test endpoint
app.get('/test', (req, res) => {
  res.send('API is working!');
});

// Member books endpoint
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
  
  db.run('INSERT INTO member_books (title, author, bookNumber) VALUES (?, ?, ?)', 
    [title, author, bookNumber], function(err) {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Book added with ID:', this.lastID);
    res.json({ id: this.lastID, title, author, bookNumber });
  });
});

// Staff books endpoint
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
  
  db.run('INSERT INTO staff_books (title, author, bookNumber) VALUES (?, ?, ?)', 
    [title, author, bookNumber], function(err) {
    if (err) {
      console.log('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Book added with ID:', this.lastID);
    res.json({ id: this.lastID, title, author, bookNumber });
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`Simple server running at http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('  GET  /test');
  console.log('  GET  /api/member-books');
  console.log('  POST /api/member-books');
  console.log('  GET  /api/staff-books');
  console.log('  POST /api/staff-books');
}); 