const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 Starting comprehensive database fix...\n');

const db = new sqlite3.Database('library.db');

db.serialize(() => {
  // Step 1: Check current database state
  console.log('📊 Checking current database state...');
  
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error('Error checking tables:', err);
      return;
    }
    
    console.log('Found tables:', tables.map(t => t.name));
    
    // Step 2: Migrate data from old books table to new member_books table
    console.log('\n🔄 Migrating books data...');
    
    db.all("SELECT * FROM books", [], (err, oldBooks) => {
      if (err) {
        console.log('No old books table found or empty');
      } else {
        console.log(`Found ${oldBooks.length} books in old table`);
        
        oldBooks.forEach((book, index) => {
          // Check if book already exists in member_books
          db.get("SELECT id FROM member_books WHERE title = ? AND author = ?", 
            [book.title, book.author], (err, existing) => {
            if (!existing) {
              // Insert into member_books
              db.run("INSERT INTO member_books (title, author, bookNumber) VALUES (?, ?, ?)",
                [book.title, book.author, book.bookNumber || `BOOK-${Date.now()}-${index}`], 
                function(err) {
                  if (err) {
                    console.error('Error migrating book:', book.title, err.message);
                  } else {
                    console.log(`✅ Migrated: ${book.title}`);
                  }
                });
            }
          });
        });
      }
    });
    
    // Step 3: Ensure all required tables exist with correct structure
    console.log('\n🏗️ Ensuring correct table structure...');
    
    // Create member_books table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS member_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      bookNumber TEXT UNIQUE,
      borrowedByType TEXT,
      borrowedById INTEGER,
      borrowedAt TEXT,
      returnedAt TEXT
    )`);
    
    // Create staff_books table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS staff_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      bookNumber TEXT UNIQUE,
      borrowedByType TEXT,
      borrowedById INTEGER,
      borrowedAt TEXT,
      returnedAt TEXT
    )`);
    
    // Create members table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      admId TEXT UNIQUE NOT NULL
    )`);
    
    // Create staff table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tscNumber TEXT UNIQUE NOT NULL
    )`);
    
    // Create history table if it doesn't exist
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
    
    // Step 4: Add sample data if tables are empty
    console.log('\n📝 Adding sample data if needed...');
    
    // Check if member_books is empty and add sample data
    db.get("SELECT COUNT(*) as count FROM member_books", [], (err, result) => {
      if (result.count === 0) {
        console.log('Adding sample books to member_books...');
        const sampleBooks = [
          ['Mathematics for Beginners', 'John Smith', 'MATH-001'],
          ['English Literature', 'Jane Doe', 'ENG-002'],
          ['Science Fundamentals', 'Dr. Wilson', 'SCI-003'],
          ['History of the World', 'Prof. Johnson', 'HIST-004'],
          ['Computer Programming', 'Alex Chen', 'CS-005']
        ];
        
        sampleBooks.forEach(([title, author, bookNumber]) => {
          db.run("INSERT INTO member_books (title, author, bookNumber) VALUES (?, ?, ?)",
            [title, author, bookNumber]);
        });
        console.log('✅ Added sample books');
      }
    });
    
    // Check if members is empty and add sample data
    db.get("SELECT COUNT(*) as count FROM members", [], (err, result) => {
      if (result.count === 0) {
        console.log('Adding sample members...');
        const sampleMembers = [
          ['Alice Johnson', 'ADM001'],
          ['Bob Smith', 'ADM002'],
          ['Carol Davis', 'ADM003'],
          ['David Wilson', 'ADM004'],
          ['Eva Brown', 'ADM005']
        ];
        
        sampleMembers.forEach(([name, admId]) => {
          db.run("INSERT INTO members (name, admId) VALUES (?, ?)", [name, admId]);
        });
        console.log('✅ Added sample members');
      }
    });
    
    // Check if staff_books is empty and add sample data
    db.get("SELECT COUNT(*) as count FROM staff_books", [], (err, result) => {
      if (result.count === 0) {
        console.log('Adding sample staff books...');
        const sampleStaffBooks = [
          ['Advanced Mathematics', 'Dr. Thompson', 'STAFF-MATH-001'],
          ['Educational Psychology', 'Prof. Garcia', 'STAFF-PSYCH-002'],
          ['Curriculum Development', 'Ms. Rodriguez', 'STAFF-CURR-003'],
          ['Classroom Management', 'Mr. Lee', 'STAFF-MGMT-004'],
          ['Teaching Methods', 'Dr. Anderson', 'STAFF-TEACH-005']
        ];
        
        sampleStaffBooks.forEach(([title, author, bookNumber]) => {
          db.run("INSERT INTO staff_books (title, author, bookNumber) VALUES (?, ?, ?)",
            [title, author, bookNumber]);
        });
        console.log('✅ Added sample staff books');
      }
    });
    
    // Step 5: Verify the fix
    setTimeout(() => {
      console.log('\n🔍 Verifying database fix...');
      
      db.get("SELECT COUNT(*) as count FROM member_books", [], (err, result) => {
        console.log(`📚 Member books: ${result.count} records`);
      });
      
      db.get("SELECT COUNT(*) as count FROM staff_books", [], (err, result) => {
        console.log(`📚 Staff books: ${result.count} records`);
      });
      
      db.get("SELECT COUNT(*) as count FROM members", [], (err, result) => {
        console.log(`👥 Members: ${result.count} records`);
      });
      
      db.get("SELECT COUNT(*) as count FROM staff", [], (err, result) => {
        console.log(`👨‍🏫 Staff: ${result.count} records`);
      });
      
      console.log('\n✅ Database fix completed!');
      console.log('🔄 Restart your server to see the changes.');
      
      db.close();
    }, 2000);
  });
}); 