const fetch = require('node-fetch');

// Test the separate book collections
async function testSeparateCollections() {
    console.log('🧪 Testing Separate Book Collections...\n');
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Test 1: Add a book to member collection
        console.log('📚 Test 1: Adding book to member collection');
        const memberBookResponse = await fetch(`${baseUrl}/api/member-books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Member Book Test',
                author: 'Member Author',
                bookNumber: 'MEM001'
            })
        });
        
        if (memberBookResponse.ok) {
            console.log('✅ Member book added successfully');
        } else {
            console.log('❌ Failed to add member book');
        }
        
        // Test 2: Add a book to staff collection
        console.log('\n📚 Test 2: Adding book to staff collection');
        const staffBookResponse = await fetch(`${baseUrl}/api/staff-books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Staff Book Test',
                author: 'Staff Author',
                bookNumber: 'STA001'
            })
        });
        
        if (staffBookResponse.ok) {
            console.log('✅ Staff book added successfully');
        } else {
            console.log('❌ Failed to add staff book');
        }
        
        // Test 3: Check member books
        console.log('\n📚 Test 3: Checking member books');
        const memberBooksResponse = await fetch(`${baseUrl}/api/member-books`);
        const memberBooks = await memberBooksResponse.json();
        console.log(`✅ Found ${memberBooks.length} member books`);
        
        // Test 4: Check staff books
        console.log('\n📚 Test 4: Checking staff books');
        const staffBooksResponse = await fetch(`${baseUrl}/api/staff-books`);
        const staffBooks = await staffBooksResponse.json();
        console.log(`✅ Found ${staffBooks.length} staff books`);
        
        // Test 5: Verify separation
        console.log('\n🎯 Test 5: Verifying separation');
        const memberBookNumbers = memberBooks.map(b => b.bookNumber);
        const staffBookNumbers = staffBooks.map(b => b.bookNumber);
        
        const hasOverlap = memberBookNumbers.some(num => staffBookNumbers.includes(num));
        
        if (!hasOverlap) {
            console.log('✅ Book collections are properly separated!');
        } else {
            console.log('❌ Book collections have overlap!');
        }
        
        console.log('\n📋 Summary:');
        console.log('   • Member books:', memberBookNumbers.join(', '));
        console.log('   • Staff books:', staffBookNumbers.join(', '));
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testSeparateCollections(); 