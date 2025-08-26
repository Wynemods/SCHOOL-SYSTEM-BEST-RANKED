// Library System Page JavaScript
let books = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
});

// Load all books from the server
async function loadBooks() {
    try {
        const response = await fetch('/api/member-books');
        if (response.ok) {
            books = await response.json();
            renderBooksBySubject();
        } else {
            showNotification('Error loading books', 'error');
        }
    } catch (error) {
        showNotification('Error loading books: ' + error.message, 'error');
    }
}

// Render books organized by subject
function renderBooksBySubject() {
    const container = document.getElementById('books-container');
    container.innerHTML = '';
    
    // Group books by subject
    const booksBySubject = {};
    books.forEach(book => {
        const subject = book.subject || 'Uncategorized';
        if (!booksBySubject[subject]) {
            booksBySubject[subject] = [];
        }
        booksBySubject[subject].push(book);
    });
    
    // Create sections for each subject
    Object.keys(booksBySubject).sort().forEach(subject => {
        const section = document.createElement('div');
        section.className = 'category-section';
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.textContent = `${subject} (${booksBySubject[subject].length} books)`;
        
        const grid = document.createElement('div');
        grid.className = 'books-grid';
        
        booksBySubject[subject].forEach(book => {
            const card = createBookCard(book);
            grid.appendChild(card);
        });
        
        section.appendChild(title);
        section.appendChild(grid);
        container.appendChild(section);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title;
    
    const author = document.createElement('div');
    author.className = 'book-author';
    author.textContent = `by ${book.author}`;
    
    const bookNumber = document.createElement('div');
    bookNumber.className = 'book-number';
    bookNumber.textContent = `Book No: ${book.bookNumber}`;
    
    const subject = document.createElement('div');
    subject.className = 'book-subject';
    subject.textContent = book.subject || 'Uncategorized';
    
    const status = document.createElement('div');
    status.className = book.borrowedById ? 'status-borrowed' : 'status-available';
    status.textContent = book.borrowedById ? '📚 Borrowed' : '✅ Available';
    
    card.appendChild(title);
    card.appendChild(author);
    card.appendChild(bookNumber);
    card.appendChild(subject);
    card.appendChild(status);
    
    return card;
}

// Add multiple books in bulk
async function addBulkBooks() {
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const subject = document.getElementById('book-subject').value;
    const copies = parseInt(document.getElementById('book-copies').value);
    const prefix = document.getElementById('book-prefix').value.trim();
    
    // Validate inputs
    if (!title || !author || !subject || !prefix) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (copies < 1 || copies > 1000) {
        showNotification('Number of copies must be between 1 and 1000', 'error');
        return;
    }
    
    // Show progress bar
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Adding books...';
    
    let successCount = 0;
    let errorCount = 0;
    
    // Add books one by one with progress updates
    for (let i = 1; i <= copies; i++) {
        const bookNumber = `${prefix}-${i.toString().padStart(3, '0')}`;
        
        try {
            const response = await fetch('/api/member-books', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    author: author,
                    bookNumber: bookNumber,
                    subject: subject
                })
            });
            
            if (response.ok) {
                successCount++;
            } else {
                const error = await response.json();
                console.error(`Failed to add book ${i}:`, error);
                errorCount++;
            }
        } catch (error) {
            console.error(`Error adding book ${i}:`, error);
            errorCount++;
        }
        
        // Update progress
        const progress = (i / copies) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `Adding books... ${i}/${copies}`;
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Hide progress bar
    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 2000);
    
    // Show results
    if (errorCount === 0) {
        showNotification(`Successfully added ${successCount} books!`, 'success');
        // Clear form
        document.getElementById('book-title').value = '';
        document.getElementById('book-author').value = '';
        document.getElementById('book-subject').value = '';
        document.getElementById('book-copies').value = '1';
        document.getElementById('book-prefix').value = '';
    } else {
        showNotification(`Added ${successCount} books successfully. ${errorCount} books failed to add.`, 'warning');
    }
    
    // Reload books to show new additions
    await loadBooks();
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Add event listeners for form validation
document.addEventListener('DOMContentLoaded', function() {
    const copiesInput = document.getElementById('book-copies');
    const prefixInput = document.getElementById('book-prefix');
    
    // Validate copies input
    copiesInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value < 1) {
            this.value = 1;
        } else if (value > 1000) {
            this.value = 1000;
        }
    });
    
    // Auto-generate prefix based on subject
    const subjectSelect = document.getElementById('book-subject');
    subjectSelect.addEventListener('change', function() {
        const subject = this.value;
        if (subject && !prefixInput.value) {
            // Generate prefix based on subject
            const prefixMap = {
                'Physics': 'PHY',
                'Chemistry': 'CHEM',
                'Biology': 'BIO',
                'Mathematics': 'MATH',
                'English': 'ENG',
                'Kiswahili': 'KIS',
                'History': 'HIST',
                'Geography': 'GEO',
                'Religious Studies': 'REL',
                'Business Studies': 'BUS',
                'Computer Studies': 'COMP',
                'Agriculture': 'AGR',
                'Home Science': 'HOME',
                'Art & Design': 'ART',
                'Music': 'MUSIC',
                'Physical Education': 'PE',
                'Literature': 'LIT',
                'French': 'FRENCH',
                'German': 'GERMAN',
                'Arabic': 'ARABIC',
                'Other': 'OTHER'
            };
            
            const prefix = prefixMap[subject] || 'BOOK';
            prefixInput.value = prefix;
        }
    });
}); 