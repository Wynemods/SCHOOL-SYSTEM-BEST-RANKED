const fetch = require('node-fetch').default;

async function testAPI() {
    console.log('🧪 Testing API endpoints...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('📡 Test 1: Server connectivity');
        const testResponse = await fetch('http://localhost:3000/test');
        if (testResponse.ok) {
            console.log('✅ Server is running');
        } else {
            console.log('❌ Server is not responding');
            return;
        }
        
        // Test 2: Check member-books endpoint
        console.log('\n📚 Test 2: Member books endpoint');
        const memberBooksResponse = await fetch('http://localhost:3000/api/member-books');
        console.log('Status:', memberBooksResponse.status);
        if (memberBooksResponse.ok) {
            const data = await memberBooksResponse.json();
            console.log('✅ Member books endpoint working, found', data.length, 'books');
        } else {
            console.log('❌ Member books endpoint failed');
            const errorText = await memberBooksResponse.text();
            console.log('Error:', errorText);
        }
        
        // Test 3: Check staff-books endpoint
        console.log('\n📚 Test 3: Staff books endpoint');
        const staffBooksResponse = await fetch('http://localhost:3000/api/staff-books');
        console.log('Status:', staffBooksResponse.status);
        if (staffBooksResponse.ok) {
            const data = await staffBooksResponse.json();
            console.log('✅ Staff books endpoint working, found', data.length, 'books');
        } else {
            console.log('❌ Staff books endpoint failed');
            const errorText = await staffBooksResponse.text();
            console.log('Error:', errorText);
        }
        
        // Test 4: Try to add a member book
        console.log('\n📚 Test 4: Adding a member book');
        const addBookResponse = await fetch('http://localhost:3000/api/member-books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Book',
                author: 'Test Author',
                bookNumber: 'TEST001'
            })
        });
        
        if (addBookResponse.ok) {
            console.log('✅ Successfully added member book');
        } else {
            console.log('❌ Failed to add member book');
            const error = await addBookResponse.json();
            console.log('Error:', error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testAPI(); 