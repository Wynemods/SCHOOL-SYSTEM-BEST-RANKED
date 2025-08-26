const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Express server setup
const server = express();
const PORT = 3000;

// Load school configuration
const configPath = path.join(__dirname, 'school-config.json');
let config = {
    schoolName: 'Central High School',
    schoolCode: 'CHS',
    databasePath: './CHS-library.db',
    port: PORT,
    adminEmail: 'admin@chs.edu',
    contactPhone: '555-0000'
};

// Try to load config file if it exists
if (fs.existsSync(configPath)) {
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.log('Using default config');
    }
}

// Database setup
const dbPath = path.join(__dirname, config.databasePath);
const db = new sqlite3.Database(dbPath);

// Middleware
server.use(express.json());
server.use(express.static(path.join(__dirname, 'library-system')));

// Create tables if they don't exist
db.serialize(() => {
    // Books table
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
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
});

// API Routes
server.get('/api/books', (req, res) => {
    db.all('SELECT * FROM books ORDER BY title', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

server.post('/api/books', (req, res) => {
    const { title, author, isbn } = req.body;
    db.run('INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)', 
        [title, author, isbn], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, title, author, isbn });
    });
});

server.put('/api/books/:id', (req, res) => {
    const { title, author, isbn } = req.body;
    db.run('UPDATE books SET title = ?, author = ?, isbn = ? WHERE id = ?',
        [title, author, isbn, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: req.params.id, title, author, isbn });
    });
});

server.delete('/api/books/:id', (req, res) => {
    // Check if book is borrowed
    db.get('SELECT borrowedById FROM books WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row && row.borrowedById) {
            res.status(400).json({ error: 'Cannot delete book that is currently borrowed' });
            return;
        }
        
        // Check borrowing history
        db.get('SELECT COUNT(*) as count FROM history WHERE bookId = ?', [req.params.id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row.count > 0) {
                res.status(400).json({ error: 'Cannot delete book with borrowing history' });
                return;
            }
            
            db.run('DELETE FROM books WHERE id = ?', [req.params.id], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Book deleted successfully' });
            });
        });
    });
});

// Members API
server.get('/api/members', (req, res) => {
    db.all('SELECT * FROM members ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

server.post('/api/members', (req, res) => {
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

server.put('/api/members/:id', (req, res) => {
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

server.delete('/api/members/:id', (req, res) => {
    // Check if member has borrowed books
    db.get('SELECT COUNT(*) as count FROM books WHERE borrowedById = ? AND borrowedByType = "member"', 
        [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row.count > 0) {
            res.status(400).json({ error: 'Cannot delete member with currently borrowed books' });
            return;
        }
        
        // Check borrowing history
        db.get('SELECT COUNT(*) as count FROM history WHERE userId = ? AND userType = "member"', 
            [req.params.id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row.count > 0) {
                res.status(400).json({ error: 'Cannot delete member with borrowing history' });
                return;
            }
            
            db.run('DELETE FROM members WHERE id = ?', [req.params.id], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Member deleted successfully' });
            });
        });
    });
});

// Staff API
server.get('/api/staff', (req, res) => {
    db.all('SELECT * FROM staff ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

server.post('/api/staff', (req, res) => {
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

server.put('/api/staff/:id', (req, res) => {
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

server.delete('/api/staff/:id', (req, res) => {
    // Check if staff has borrowed books
    db.get('SELECT COUNT(*) as count FROM books WHERE borrowedById = ? AND borrowedByType = "staff"', 
        [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row.count > 0) {
            res.status(400).json({ error: 'Cannot delete staff with currently borrowed books' });
            return;
        }
        
        // Check borrowing history
        db.get('SELECT COUNT(*) as count FROM history WHERE userId = ? AND userType = "staff"', 
            [req.params.id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row.count > 0) {
                res.status(400).json({ error: 'Cannot delete staff with borrowing history' });
                return;
            }
            
            db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Staff deleted successfully' });
            });
        });
    });
});

// Borrow API
server.post('/api/borrow', (req, res) => {
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
server.post('/api/return', (req, res) => {
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
server.get('/api/history', (req, res) => {
    db.all('SELECT * FROM history ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Block manual history modifications
server.post('/api/history', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

server.put('/api/history/:id', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

server.delete('/api/history/:id', (req, res) => {
    res.status(403).json({ error: 'History cannot be manually modified' });
});

// Serve main page
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'index.html'));
});

// Serve staff page
server.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'staff.html'));
});

// Serve book history page
server.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'library-system', 'book-history.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`🏫 ${config.schoolName} Library System running at http://localhost:${PORT}`);
});

// Electron app setup
let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: `${config.schoolName} Library System`,
        show: false
    });

    // Load the app
    mainWindow.loadURL('http://localhost:3000');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Refresh',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Developer Tools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/library-system');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Quit app when all windows are closed
app.on('before-quit', () => {
    // Close database connection
    if (db) {
        db.close();
    }
});
