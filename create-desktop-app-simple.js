const fs = require('fs');
const path = require('path');

class DesktopAppCreator {
    constructor() {
        this.baseDir = process.cwd();
    }

    // Create desktop application for a school
    createDesktopApp(schoolName, schoolCode) {
        try {
            console.log(`🖥️ Creating desktop app for: ${schoolName} (${schoolCode})`);
            
            // Create desktop app directory
            const appDir = path.join(this.baseDir, 'desktop-apps', schoolCode);
            if (!fs.existsSync(appDir)) {
                fs.mkdirSync(appDir, { recursive: true });
            }
            
            // Create all necessary files
            this.createPackageJson(appDir, schoolName, schoolCode);
            this.createMainProcess(appDir, schoolName, schoolCode);
            this.createPreloadScript(appDir);
            this.createAppIcon(appDir);
            this.createBuildScript(appDir, schoolName, schoolCode);
            this.copyLibrarySystem(appDir);
            this.createSchoolConfig(appDir, schoolName, schoolCode);
            
            console.log(`✅ Desktop app created at: ${appDir}`);
            return appDir;
            
        } catch (error) {
            console.error(`❌ Error creating desktop app: ${error.message}`);
            return null;
        }
    }

    // Create package.json
    createPackageJson(appDir, schoolName, schoolCode) {
        const packageJson = {
            "name": `${schoolCode.toLowerCase()}-library-system`,
            "version": "1.0.0",
            "description": `Library Management System for ${schoolName}`,
            "main": "main.js",
            "scripts": {
                "start": "electron .",
                "dev": "electron . --dev",
                "build": "electron-builder",
                "build-win": "electron-builder --win",
                "build-mac": "electron-builder --mac",
                "build-linux": "electron-builder --linux",
                "dist": "npm run build"
            },
            "dependencies": {
                "electron": "^25.0.0",
                "express": "^4.18.2",
                "sqlite3": "^5.1.6"
            },
            "devDependencies": {
                "electron-builder": "^24.6.4"
            },
            "build": {
                "appId": `com.library.${schoolCode.toLowerCase()}`,
                "productName": `${schoolName} Library System`,
                "directories": {
                    "output": "dist"
                },
                "files": [
                    "main.js",
                    "preload.js",
                    "library-system/**/*",
                    "node_modules/**/*",
                    "*.db",
                    "school-config.json"
                ],
                "win": {
                    "target": "nsis",
                    "icon": "assets/icon.ico",
                    "requestedExecutionLevel": "asInvoker"
                },
                "mac": {
                    "target": "dmg",
                    "icon": "assets/icon.icns"
                },
                "linux": {
                    "target": "AppImage",
                    "icon": "assets/icon.png"
                },
                "nsis": {
                    "oneClick": false,
                    "allowToChangeInstallationDirectory": true,
                    "createDesktopShortcut": true,
                    "createStartMenuShortcut": true,
                    "shortcutName": `${schoolName} Library System`
                }
            },
            "author": "School Library System",
            "license": "MIT"
        };
        
        fs.writeFileSync(
            path.join(appDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
    }

    // Create school configuration
    createSchoolConfig(appDir, schoolName, schoolCode) {
        const config = {
            schoolName: schoolName,
            schoolCode: schoolCode,
            databasePath: `./${schoolCode}-library.db`,
            port: 3000,
            adminEmail: `admin@${schoolCode.toLowerCase()}.edu`,
            contactPhone: '555-0000'
        };
        
        fs.writeFileSync(
            path.join(appDir, 'school-config.json'),
            JSON.stringify(config, null, 2)
        );
    }

    // Create main Electron process
    createMainProcess(appDir, schoolName, schoolCode) {
        const mainProcess = `const { app, BrowserWindow, Menu, shell } = require('electron');
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
    schoolName: '${schoolName}',
    schoolCode: '${schoolCode}',
    databasePath: './${schoolCode}-library.db',
    port: PORT,
    adminEmail: 'admin@${schoolCode.toLowerCase()}.edu',
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
    db.run(\`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        isbn TEXT,
        borrowedById INTEGER,
        borrowedByType TEXT,
        borrowedAt TEXT
    )\`);
    
    // Members table
    db.run(\`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )\`);
    
    // Staff table
    db.run(\`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )\`);
    
    // History table
    db.run(\`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER,
        bookTitle TEXT,
        userId INTEGER,
        userName TEXT,
        userType TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);
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
                db.get(\`SELECT name FROM \${table} WHERE id = ?\`, [book.borrowedById], (err, user) => {
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
    console.log(\`🏫 \${config.schoolName} Library System running at http://localhost:\${PORT}\`);
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
        title: \`\${config.schoolName} Library System\`,
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
`;
        
        fs.writeFileSync(path.join(appDir, 'main.js'), mainProcess);
    }

    // Create preload script
    createPreloadScript(appDir) {
        const preloadScript = `const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Add any electron-specific APIs here if needed
    platform: process.platform,
    version: process.versions.electron
});
`;
        
        fs.writeFileSync(path.join(appDir, 'preload.js'), preloadScript);
    }

    // Create app icon
    createAppIcon(appDir) {
        const assetsDir = path.join(appDir, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        // Create a simple icon placeholder
        const iconSvg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#4A90E2"/>
  <rect x="40" y="60" width="176" height="136" fill="white" rx="8"/>
  <rect x="60" y="80" width="136" height="16" fill="#333" rx="2"/>
  <rect x="60" y="110" width="100" height="12" fill="#666" rx="2"/>
  <rect x="60" y="130" width="80" height="12" fill="#666" rx="2"/>
  <rect x="60" y="150" width="120" height="12" fill="#666" rx="2"/>
  <rect x="60" y="170" width="90" height="12" fill="#666" rx="2"/>
  <circle cx="200" cy="100" r="20" fill="#4A90E2"/>
  <text x="200" y="105" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">L</text>
</svg>`;
        
        fs.writeFileSync(path.join(assetsDir, 'icon.svg'), iconSvg);
        
        console.log(`   🎨 Icon created: ${path.join(assetsDir, 'icon.svg')}`);
        console.log(`   💡 For production, convert to .ico (Windows), .icns (Mac), .png (Linux)`);
    }

    // Create build script
    createBuildScript(appDir, schoolName, schoolCode) {
        const buildScript = `@echo off
echo 🏫 Building Desktop App for ${schoolName}...
echo.

echo 📦 Installing dependencies...
npm install

echo.
echo 🔨 Building application...
npm run build

echo.
echo ✅ Build complete!
echo 📁 Check the 'dist' folder for the installer
echo.

pause
`;
        
        fs.writeFileSync(path.join(appDir, 'build-app.bat'), buildScript);
        
        // Also create Unix build script
        const buildScriptUnix = `#!/bin/bash
echo "🏫 Building Desktop App for ${schoolName}..."
echo

echo "📦 Installing dependencies..."
npm install

echo
echo "🔨 Building application..."
npm run build

echo
echo "✅ Build complete!"
echo "📁 Check the 'dist' folder for the installer"
echo
`;
        
        fs.writeFileSync(path.join(appDir, 'build-app.sh'), buildScriptUnix);
        
        try {
            fs.chmodSync(path.join(appDir, 'build-app.sh'), '755');
        } catch (error) {
            // Windows doesn't support chmod
        }
    }

    // Copy library system files
    copyLibrarySystem(appDir) {
        const librarySystemDir = path.join(this.baseDir, 'library-system');
        const appLibraryDir = path.join(appDir, 'library-system');
        
        if (fs.existsSync(librarySystemDir)) {
            if (!fs.existsSync(appLibraryDir)) {
                fs.mkdirSync(appLibraryDir, { recursive: true });
            }
            
            // Copy all frontend files
            const files = fs.readdirSync(librarySystemDir);
            files.forEach(file => {
                const sourcePath = path.join(librarySystemDir, file);
                const destPath = path.join(appLibraryDir, file);
                
                if (fs.statSync(sourcePath).isDirectory()) {
                    this.copyDirectory(sourcePath, destPath);
                } else {
                    fs.copyFileSync(sourcePath, destPath);
                }
            });
            
            console.log(`   📁 Library system files copied`);
        }
    }

    // Copy directory recursively
    copyDirectory(source, destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }
        
        const files = fs.readdirSync(source);
        files.forEach(file => {
            const sourcePath = path.join(source, file);
            const destPath = path.join(destination, file);
            
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        });
    }
}

// Create desktop apps for all schools
const creator = new DesktopAppCreator();

console.log('🖥️ Creating Desktop Applications for Schools');
console.log('==========================================\n');

const schools = [
    { name: 'Springfield High School', code: 'SHS' },
    { name: 'Lincoln Elementary', code: 'LES' },
    { name: 'Washington Middle School', code: 'WMS' },
    { name: 'Riverside Academy', code: 'RAC' },
    { name: 'Central High School', code: 'CHS' }
];

console.log('📝 Creating desktop applications...\n');

schools.forEach(school => {
    const appDir = creator.createDesktopApp(school.name, school.code);
    if (appDir) {
        console.log(`✅ ${school.name} desktop app created`);
    }
});

console.log('\n🎉 Desktop Applications Created!');
console.log('==============================\n');

console.log('📁 Desktop apps created in:');
console.log('   📂 desktop-apps/');
schools.forEach(school => {
    console.log(`      🏫 ${school.name} (${school.code})`);
});

console.log('\n🚀 To build desktop applications:');
console.log('   1. Navigate to desktop-apps/[SCHOOL_CODE]');
console.log('   2. Run: npm install');
console.log('   3. Run: npm run build');
console.log('   4. Installer will be in the dist/ folder');
console.log('\n💡 Each school gets their own desktop app with icon!');
console.log('🎯 Users can double-click the icon to launch the library system!'); 