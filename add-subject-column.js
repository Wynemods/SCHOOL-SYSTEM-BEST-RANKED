const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('library.db');

console.log('🔧 Adding subject column to existing tables...');

db.serialize(() => {
    // Add subject column to member_books table
    db.run(`ALTER TABLE member_books ADD COLUMN subject TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Subject column already exists in member_books table');
            } else {
                console.log('❌ Error adding subject column to member_books:', err.message);
            }
        } else {
            console.log('✅ Added subject column to member_books table');
        }
    });
    
    // Add subject column to staff_books table
    db.run(`ALTER TABLE staff_books ADD COLUMN subject TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Subject column already exists in staff_books table');
            } else {
                console.log('❌ Error adding subject column to staff_books:', err.message);
            }
        } else {
            console.log('✅ Added subject column to staff_books table');
        }
    });
    
    // Verify the tables structure
    setTimeout(() => {
        console.log('\n📋 Checking table structure...');
        
        db.all(`PRAGMA table_info(member_books)`, (err, rows) => {
            if (err) {
                console.log('❌ Error checking member_books structure:', err.message);
            } else {
                console.log('📚 member_books table columns:');
                rows.forEach(row => {
                    console.log(`  - ${row.name} (${row.type})`);
                });
            }
        });
        
        db.all(`PRAGMA table_info(staff_books)`, (err, rows) => {
            if (err) {
                console.log('❌ Error checking staff_books structure:', err.message);
            } else {
                console.log('📚 staff_books table columns:');
                rows.forEach(row => {
                    console.log(`  - ${row.name} (${row.type})`);
                });
            }
            
            // Close database after checking
            setTimeout(() => {
                db.close();
                console.log('\n✅ Database migration completed!');
            }, 1000);
        });
    }, 1000);
}); 