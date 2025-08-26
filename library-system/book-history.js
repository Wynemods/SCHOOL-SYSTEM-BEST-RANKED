// Global variables to store data
let allHistory = [];
let allMembers = [];
let allStaff = [];
let allMemberBooks = [];
let allStaffBooks = [];

function formatDateTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    // Convert to EAT (UTC+3)
    const eatOffset = 3 * 60; // minutes
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const eatDate = new Date(utc + eatOffset * 60000);
    
    // Compact format: DD/MM/YY HH:MM
    const day = eatDate.getDate().toString().padStart(2, '0');
    const month = (eatDate.getMonth() + 1).toString().padStart(2, '0');
    const year = eatDate.getFullYear().toString().slice(-2);
    const hours = eatDate.getHours().toString().padStart(2, '0');
    const minutes = eatDate.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function daysBetween(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : '';
}

// Calculate statistics
function updateStatistics() {
    const totalBorrows = allHistory.length;
    const activeBorrows = allHistory.filter(entry => !entry.returnedAt).length;
    const totalReturns = allHistory.filter(entry => entry.returnedAt).length;
    
    // Calculate average days for returned books
    const returnedBooks = allHistory.filter(entry => entry.returnedAt);
    const totalDays = returnedBooks.reduce((sum, entry) => {
        const days = daysBetween(entry.borrowedAt, entry.returnedAt);
        return sum + (days || 0);
    }, 0);
    const avgDays = returnedBooks.length > 0 ? Math.round(totalDays / returnedBooks.length) : 0;
    
    // Update statistics display
    document.getElementById('total-borrows').textContent = totalBorrows;
    document.getElementById('active-borrows').textContent = activeBorrows;
    document.getElementById('total-returns').textContent = totalReturns;
    document.getElementById('avg-days').textContent = avgDays;
}

// Load all necessary data
async function loadAllData() {
    try {
        const [historyRes, membersRes, staffRes, memberBooksRes, staffBooksRes] = await Promise.all([
            fetch('/api/history'),
            fetch('/api/members'),
            fetch('/api/staff'),
            fetch('/api/member-books'),
            fetch('/api/staff-books')
        ]);
        
        allHistory = await historyRes.json();
        allMembers = await membersRes.json();
        allStaff = await staffRes.json();
        allMemberBooks = await memberBooksRes.json();
        allStaffBooks = await staffBooksRes.json();
        
        updateStatistics();
        renderHistory();
        setupSearch();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Enhanced history rendering with improved styling
async function renderHistory() {
    const memberTbody = document.querySelector('#member-history-table tbody');
    const staffTbody = document.querySelector('#staff-history-table tbody');
    memberTbody.innerHTML = '';
    staffTbody.innerHTML = '';
    
    let memberCount = 1;
    let staffCount = 1;
    
    allHistory.forEach(entry => {
        const row = document.createElement('tr');
        
        // Find related data
        const member = allMembers.find(m => m.id === entry.userId && entry.userType === 'member');
        const staff = allStaff.find(s => s.id === entry.userId && entry.userType === 'staff');
        const memberBook = allMemberBooks.find(b => b.id === entry.bookId);
        const staffBook = allStaffBooks.find(b => b.id === entry.bookId);
        
        const book = memberBook || staffBook;
        
        // Create table cells
        const noTd = document.createElement('td');
        const nameTd = document.createElement('td');
        const idTd = document.createElement('td');
        const bookTitleTd = document.createElement('td');
        const bookNumberTd = document.createElement('td');
        const borrowedTd = document.createElement('td');
        const returnedTd = document.createElement('td');
        const daysTd = document.createElement('td');
        const statusTd = document.createElement('td');
        
        // Fill data
        nameTd.textContent = entry.name;
        idTd.textContent = member ? member.admId : (staff ? staff.tscNumber : '');
        bookTitleTd.textContent = entry.bookTitle;
        bookNumberTd.textContent = book ? book.bookNumber : '';
        borrowedTd.textContent = formatDateTime(entry.borrowedAt);
        returnedTd.textContent = formatDateTime(entry.returnedAt);
        daysTd.textContent = entry.returnedAt ? daysBetween(entry.borrowedAt, entry.returnedAt) : '';
        statusTd.textContent = entry.returnedAt ? 'Returned' : 'Borrowed';
        
        // Apply styling classes with enhanced visual appeal
        bookNumberTd.className = 'book-number-cell';
        borrowedTd.className = 'date-cell';
        returnedTd.className = 'date-cell';
        daysTd.className = 'days-cell';
        
        // Enhanced status badge styling
        statusTd.className = `status-badge ${entry.returnedAt ? 'status-returned' : 'status-borrowed'}`;
        
        // Add hover effect to rows
        row.style.cursor = 'pointer';
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f0fdf4';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
        
        if (entry.userType === 'member') {
            noTd.textContent = memberCount++;
            row.append(noTd, nameTd, idTd, bookTitleTd, bookNumberTd, borrowedTd, returnedTd, daysTd, statusTd);
            memberTbody.appendChild(row);
        } else if (entry.userType === 'staff') {
            noTd.textContent = staffCount++;
            row.append(noTd, nameTd, idTd, bookTitleTd, bookNumberTd, borrowedTd, returnedTd, daysTd, statusTd);
            staffTbody.appendChild(row);
        }
    });
    
    // Add empty state if no data with improved styling
    if (memberTbody.children.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 9;
        emptyCell.className = 'empty-state';
        emptyCell.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📚</div>
            <div>No member borrowing history found</div>
            <div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">Start borrowing books to see history here</div>
        `;
        emptyRow.appendChild(emptyCell);
        memberTbody.appendChild(emptyRow);
    }
    
    if (staffTbody.children.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 9;
        emptyCell.className = 'empty-state';
        emptyCell.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">👨‍🏫</div>
            <div>No staff borrowing history found</div>
            <div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">Start borrowing books to see history here</div>
        `;
        emptyRow.appendChild(emptyCell);
        staffTbody.appendChild(emptyRow);
    }
}

// Enhanced search functionality with visual feedback
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            // Show all rows
            document.querySelectorAll('#member-history-table tbody tr, #staff-history-table tbody tr').forEach(row => {
                row.style.display = '';
                // Remove search highlight
                row.querySelectorAll('td').forEach(cell => {
                    cell.style.backgroundColor = '';
                });
            });
            return;
        }
        
        // Filter rows based on search term
        document.querySelectorAll('#member-history-table tbody tr, #staff-history-table tbody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 9) return; // Skip empty state rows
            
            const name = cells[1]?.textContent.toLowerCase() || '';
            const id = cells[2]?.textContent.toLowerCase() || '';
            const bookTitle = cells[3]?.textContent.toLowerCase() || '';
            const bookNumber = cells[4]?.textContent.toLowerCase() || '';
            
            const matches = name.includes(searchTerm) || 
                           id.includes(searchTerm) || 
                           bookTitle.includes(searchTerm) || 
                           bookNumber.includes(searchTerm);
            
            row.style.display = matches ? '' : 'none';
            
            // Add search highlight effect
            if (matches) {
                cells.forEach((cell, index) => {
                    const cellText = cell.textContent.toLowerCase();
                    if (cellText.includes(searchTerm)) {
                        cell.style.backgroundColor = '#fef3c7';
                        cell.style.transition = 'background-color 0.3s ease';
                    }
                });
            }
        });
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadAllData); 