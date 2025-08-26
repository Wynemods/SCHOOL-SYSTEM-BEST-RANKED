const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('library.db');

console.log('🔍 Checking database tables...\n');

// Check if tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.log('❌ Error checking tables:', err.message);
        return;
    }
    
    console.log('📋 Found tables:');
    tables.forEach(table => {
        console.log('   •', table.name);
    });
    
    // Check member_books table structure
    console.log('\n📚 Checking member_books table:');
    db.all("PRAGMA table_info(member_books)", [], (err, columns) => {
        if (err) {
            console.log('❌ member_books table not found or error:', err.message);
        } else {
            console.log('✅ member_books table exists with columns:');
            columns.forEach(col => {
                console.log('   •', col.name, '(', col.type, ')');
            });
        }
        
        // Check staff_books table structure
        console.log('\n📚 Checking staff_books table:');
        db.all("PRAGMA table_info(staff_books)", [], (err, columns) => {
            if (err) {
                console.log('❌ staff_books table not found or error:', err.message);
            } else {
                console.log('✅ staff_books table exists with columns:');
                columns.forEach(col => {
                    console.log('   •', col.name, '(', col.type, ')');
                });
            }
            
            // Check if there's any data
            console.log('\n📊 Checking for data:');
            db.all("SELECT COUNT(*) as count FROM member_books", [], (err, result) => {
                if (err) {
                    console.log('❌ Error checking member_books count:', err.message);
                } else {
                    console.log('   • member_books:', result[0].count, 'records');
                }
                
                db.all("SELECT COUNT(*) as count FROM staff_books", [], (err, result) => {
                    if (err) {
                        console.log('❌ Error checking staff_books count:', err.message);
                    } else {
                        console.log('   • staff_books:', result[0].count, 'records');
                    }
                    
                    db.close();
                });
            });
        });
    });
}); 