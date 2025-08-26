const fetch = require('node-fetch').default;

async function testSimpleServer() {
    console.log('🧪 Testing Simple Server...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('📡 Test 1: Server connectivity');
        const testResponse = await fetch('http://localhost:3002/test');
        if (testResponse.ok) {
            console.log('✅ Server is running');
        } else {
            console.log('❌ Server is not responding');
            return;
        }
        
        // Test 2: Check member-books endpoint
        console.log('\n📚 Test 2: Member books endpoint');
        const memberBooksResponse = await fetch('http://localhost:3002/api/member-books');
        console.log('Status:', memberBooksResponse.status);
        if (memberBooksResponse.ok) {
            const data = await memberBooksResponse.json();
            console.log('✅ Member books endpoint working, found', data.length, 'books');
        } else {
            console.log('❌ Member books endpoint failed');
            const errorText = await memberBooksResponse.text();
            console.log('Error:', errorText);
        }
        
        // Test 3: Add a member book
        console.log('\n📚 Test 3: Adding a member book');
        const addBookResponse = await fetch('http://localhost:3002/api/member-books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Simple Test Book',
                author: 'Simple Test Author',
                bookNumber: 'SIMP001'
            })
        });
        
        if (addBookResponse.ok) {
            console.log('✅ Successfully added member book');
            const result = await addBookResponse.json();
            console.log('Book added:', result);
        } else {
            console.log('❌ Failed to add member book');
            const error = await addBookResponse.json();
            console.log('Error:', error);
        }
        
        // Test 4: Check member-books endpoint again
        console.log('\n📚 Test 4: Checking member books again');
        const memberBooksResponse2 = await fetch('http://localhost:3002/api/member-books');
        if (memberBooksResponse2.ok) {
            const data = await memberBooksResponse2.json();
            console.log('✅ Found', data.length, 'books in member collection');
            data.forEach(book => {
                console.log('   •', book.title, 'by', book.author, '(ID:', book.id, ')');
            });
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testSimpleServer(); 