
class LibrarySystem {
    constructor() {
        this.books = [];
        this.members = [];
        this.currentBorrowBookId = null;
        this.loadData();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Load books
            const booksResponse = await fetch('/api/member-books');
            this.books = await booksResponse.json();
            
            // Load members
            const membersResponse = await fetch('/api/members');
            this.members = await membersResponse.json();
            
            this.render();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        }
    }

    setupEventListeners() {
        const bookForm = document.getElementById('book-form');
        const memberForm = document.getElementById('member-form');
        const bookCancelBtn = document.getElementById('book-cancel-btn');
        const memberCancelBtn = document.getElementById('member-cancel-btn');
        // Book form submission
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookIdInput = document.getElementById('book-id');
            const titleInput = document.getElementById('book-title');
            const authorInput = document.getElementById('book-author');
            const bookNumberInput = document.getElementById('book-number');
            
            const id = bookIdInput.value ? parseInt(bookIdInput.value) : null;
            const title = titleInput.value.trim();
            const author = authorInput.value.trim();
            const bookNumber = bookNumberInput.value.trim();

            if (id) {
                await this.updateBook(id, title, author, bookNumber);
            } else {
                await this.addBook(title, author, bookNumber);
            }
            
            bookForm.reset();
            bookIdInput.value = '';
            bookCancelBtn.style.display = 'none';
        });

        // Member form submission
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberIdInput = document.getElementById('member-id');
            const nameInput = document.getElementById('member-name');
            const admIdInput = document.getElementById('member-admid');
            
            const id = memberIdInput.value ? parseInt(memberIdInput.value) : null;
            const name = nameInput.value.trim();
            const admId = admIdInput.value.trim();

            if (id) {
                await this.updateMember(id, name, admId);
            } else {
                await this.addMember(name, admId);
            }
            
            memberForm.reset();
            memberIdInput.value = '';
            memberCancelBtn.style.display = 'none';
        });

        // Cancel buttons
        bookCancelBtn.addEventListener('click', () => {
            bookForm.reset();
            document.getElementById('book-id').value = '';
            bookCancelBtn.style.display = 'none';
        });

        memberCancelBtn.addEventListener('click', () => {
            memberForm.reset();
            document.getElementById('member-id').value = '';
            memberCancelBtn.style.display = 'none';
        });

        // Navigation buttons (optional, since they're handled by HTML links)
        let bookHistoryBtn = document.getElementById('book-history-btn');
        let staffBtn = document.getElementById('staff-btn');
        if (bookHistoryBtn) {
            bookHistoryBtn.addEventListener('click', () => {
                window.location.href = '/book-history';
            });
        }
        if (staffBtn) {
            staffBtn.addEventListener('click', () => {
                window.location.href = '/staff';
            });
        }

        // Borrow modal event listeners
        const borrowForm = document.getElementById('borrow-form');
        const borrowCancelBtn = document.getElementById('borrow-cancel-btn');
        
        borrowForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberName = document.getElementById('borrow-member-name').value.trim();
            if (!memberName) return;
            
            const member = this.members.find(m => m.name.toLowerCase() === memberName.toLowerCase());
            if (!member) {
                this.showNotification('Member not found!', 'error');
                return;
            }
            
            try {
                            // Get CSRF token
                            const csrfToken = document.getElementById('csrf-token').value;
                            
                            const response = await fetch('/api/borrow', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-Token': csrfToken
                                },
                                body: JSON.stringify({
                                    bookId: this.currentBorrowBookId,
                                    userType: 'member',
                                    userId: member.id,
                                    name: member.name
                                })
                            });
                
                if (response.ok) {
                    await this.loadData(); // Reload data
                    this.showNotification('✅ Book borrowed successfully!', 'success');
                    // Hide modal
                    document.getElementById('borrow-modal').style.display = 'none';
                } else {
                    const error = await response.json();
                    this.showNotification(`❌ ${error.error || 'Error borrowing book'}`, 'error');
                }
            } catch (error) {
                console.error('Error borrowing book:', error);
                this.showNotification('❌ Error borrowing book', 'error');
            }
        });
        
        borrowCancelBtn.addEventListener('click', () => {
            document.getElementById('borrow-modal').style.display = 'none';
        });

        // Enhanced search functionality with highlighting
        const memberSearch = document.getElementById('member-search');
        
        memberSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            // Clear existing highlights
            document.querySelectorAll('.search-highlight').forEach(el => {
                el.classList.remove('search-highlight');
            });
            
            if (!searchTerm) {
                // Show all rows
                document.querySelectorAll('#books-table tbody tr, #members-table tbody tr').forEach(row => {
                    row.style.display = '';
                });
                return;
            }
            
            // Filter books table rows
            document.querySelectorAll('#books-table tbody tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 6) return; // Skip empty rows
                
                const bookNumber = cells[1]?.textContent.toLowerCase() || '';
                const title = cells[2]?.textContent.toLowerCase() || '';
                const author = cells[3]?.textContent.toLowerCase() || '';
                const borrowedBy = cells[4]?.textContent.toLowerCase() || '';
                
                const matches = bookNumber.includes(searchTerm) || 
                               title.includes(searchTerm) || 
                               author.includes(searchTerm) || 
                               borrowedBy.includes(searchTerm);
                
                row.style.display = matches ? '' : 'none';
                
                // Highlight matching cells
                if (matches) {
                    cells.forEach((cell, index) => {
                        const cellText = cell.textContent.toLowerCase();
                        if (cellText.includes(searchTerm)) {
                            cell.classList.add('search-highlight');
                        }
                    });
                }
            });
            
            // Filter members table rows
            document.querySelectorAll('#members-table tbody tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return; // Skip empty rows
                
                const name = cells[1]?.textContent.toLowerCase() || '';
                const admId = cells[2]?.textContent.toLowerCase() || '';
                const borrowedBooks = cells[3]?.textContent.toLowerCase() || '';
                
                const matches = name.includes(searchTerm) || 
                               admId.includes(searchTerm) || 
                               borrowedBooks.includes(searchTerm);
                
                row.style.display = matches ? '' : 'none';
                
                // Highlight matching cells
                if (matches) {
                    cells.forEach((cell, index) => {
                        const cellText = cell.textContent.toLowerCase();
                        if (cellText.includes(searchTerm)) {
                            cell.classList.add('search-highlight');
                        }
                    });
                }
            });
        });
    }

    render() {
        this.renderBooks();
        this.renderMembers();
    }

    renderBooks() {
        const tbody = document.querySelector('#books-table tbody');
        tbody.innerHTML = '';
        
        this.books.forEach((book, index) => {
            const tr = document.createElement('tr');
            
            // Number
            const numberTd = document.createElement('td');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);
            
            // Book Number
            const bookNumberTd = document.createElement('td');
            bookNumberTd.textContent = book.bookNumber || 'N/A';
            tr.appendChild(bookNumberTd);
            
            // Title
            const titleTd = document.createElement('td');
            titleTd.textContent = book.title;
            tr.appendChild(titleTd);
            
            // Author
            const authorTd = document.createElement('td');
            authorTd.textContent = book.author;
            tr.appendChild(authorTd);
            
            // Borrowed By
            const borrowedByTd = document.createElement('td');
            if (book.borrowedById) {
                const member = this.members.find(m => m.id === book.borrowedById);
                borrowedByTd.textContent = member ? member.name : 'Unknown';
            } else {
                borrowedByTd.textContent = 'Available';
            }
            tr.appendChild(borrowedByTd);
            
            // Actions
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => this.editBook(book.id);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => this.deleteBook(book.id);
            
            const borrowBtn = document.createElement('button');
            borrowBtn.textContent = book.borrowedById ? 'Return' : 'Borrow';
            borrowBtn.className = book.borrowedById ? 'btn-return' : 'btn-borrow';
            borrowBtn.onclick = () => book.borrowedById ? this.returnBook(book.id) : this.borrowBook(book.id);
            
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            actionsTd.appendChild(borrowBtn);
            tr.appendChild(actionsTd);
            
            tbody.appendChild(tr);
        });
    }

    renderMembers() {
        const tbody = document.querySelector('#members-table tbody');
        tbody.innerHTML = '';
        
        this.members.forEach((member, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-member-id', member.id);
            
            // Number
            const numberTd = document.createElement('td');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);
            
            // Name
            const nameTd = document.createElement('td');
            nameTd.textContent = member.name;
            tr.appendChild(nameTd);
            
            // ADM/ID No
            const admIdTd = document.createElement('td');
            admIdTd.textContent = member.admId;
            tr.appendChild(admIdTd);
            
            // Borrowed Books
            const borrowedBooksTd = document.createElement('td');
            const borrowedBooks = this.books.filter(book => book.borrowedById === member.id);
            borrowedBooksTd.textContent = borrowedBooks.length;
            tr.appendChild(borrowedBooksTd);
            
            // Actions
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => this.editMember(member.id);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => this.deleteMember(member.id);
            
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            
            // Only show return button if member has more than 1 borrowed book
            if (borrowedBooks.length > 1) {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return Books';
                returnBtn.className = 'btn-return';
                returnBtn.onclick = () => this.showMemberReturnModal(member.id);
                actionsTd.appendChild(returnBtn);
            }
            
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
    }

    filterMembers(searchTerm) {
        const tbody = document.querySelector('#members-table tbody');
        tbody.innerHTML = '';
        
        const filteredMembers = this.members.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.admId.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        filteredMembers.forEach((member, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-member-id', member.id);
            
            const numberTd = document.createElement('td');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);
            
            const nameTd = document.createElement('td');
            nameTd.textContent = member.name;
            tr.appendChild(nameTd);
            
            const admIdTd = document.createElement('td');
            admIdTd.textContent = member.admId;
            tr.appendChild(admIdTd);
            
            const borrowedBooksTd = document.createElement('td');
            const borrowedBooks = this.books.filter(book => book.borrowedById === member.id);
            borrowedBooksTd.textContent = borrowedBooks.length;
            tr.appendChild(borrowedBooksTd);
            
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => this.editMember(member.id);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => this.deleteMember(member.id);
            
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            
            // Only show return button if member has more than 1 borrowed book
            if (borrowedBooks.length > 1) {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return Books';
                returnBtn.className = 'btn-return';
                returnBtn.onclick = () => this.showMemberReturnModal(member.id);
                actionsTd.appendChild(returnBtn);
            }
            
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
    }

    async addBook(title, author, bookNumber) {
            try {
                // Get CSRF token
                const csrfToken = document.getElementById('csrf-token').value;
                
                const response = await fetch('/api/member-books', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ title, author, bookNumber })
                });
            
            if (response.ok) {
                const newBook = await response.json();
                this.books.push(newBook);
                this.renderBooks();
                this.showNotification('✅ Book added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error adding book'}`, 'error');
            }
        } catch (error) {
            console.error('Error adding book:', error);
            this.showNotification('❌ Error adding book', 'error');
        }
    }

    async updateBook(id, title, author, bookNumber) {
        try {
            const response = await fetch(`/api/member-books/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, bookNumber })
            });
            
            if (response.ok) {
                const updatedBook = await response.json();
                const index = this.books.findIndex(b => b.id === id);
                if (index !== -1) {
                    this.books[index] = updatedBook;
                    this.renderBooks();
                    this.showNotification('✅ Book updated successfully!', 'success');
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error updating book'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating book:', error);
            this.showNotification('❌ Error updating book', 'error');
        }
    }

    async deleteBook(id) {
        try {
            const response = await fetch(`/api/member-books/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.books = this.books.filter(b => b.id !== id);
                this.renderBooks();
                this.showNotification('✅ Book deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error deleting book'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            this.showNotification('❌ Error deleting book', 'error');
        }
    }

    editBook(id) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            document.getElementById('book-id').value = book.id;
            document.getElementById('book-title').value = book.title;
            document.getElementById('book-author').value = book.author;
            document.getElementById('book-number').value = book.bookNumber || '';
            document.getElementById('book-cancel-btn').style.display = 'inline';
        }
    }

    async addMember(name, admId) {
            try {
                // Get CSRF token
                const csrfToken = document.getElementById('csrf-token').value;
                
                const response = await fetch('/api/members', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ name, admId })
                });
            
            if (response.ok) {
                const newMember = await response.json();
                this.members.push(newMember);
                this.renderMembers();
                this.showNotification('✅ Member added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error adding member'}`, 'error');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            this.showNotification('❌ Error adding member', 'error');
        }
    }

    async updateMember(id, name, admId) {
        try {
            const response = await fetch(`/api/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, admId })
            });
            
            if (response.ok) {
                const updatedMember = await response.json();
                const index = this.members.findIndex(m => m.id === id);
                if (index !== -1) {
                    this.members[index] = updatedMember;
                    this.renderMembers();
                    this.showNotification('✅ Member updated successfully!', 'success');
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error updating member'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating member:', error);
            this.showNotification('❌ Error updating member', 'error');
        }
    }

    async deleteMember(id) {
        try {
            const response = await fetch(`/api/members/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.members = this.members.filter(m => m.id !== id);
                this.renderMembers();
                this.showNotification('✅ Member deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error deleting member'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            this.showNotification('❌ Error deleting member', 'error');
        }
    }

    editMember(id) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            document.getElementById('member-id').value = member.id;
            document.getElementById('member-name').value = member.name;
            document.getElementById('member-admid').value = member.admId;
            document.getElementById('member-cancel-btn').style.display = 'inline';
        }
    }

    async borrowBook(bookId) {
        // Show our custom styled modal instead of browser prompt
        const modal = document.getElementById('borrow-modal');
        const nameInput = document.getElementById('borrow-member-name');
        
        // Clear previous input and show modal
        nameInput.value = '';
        modal.style.display = 'flex';
        
        // Focus on input
        nameInput.focus();
        
        // Store the book ID for the form submission
        this.currentBorrowBookId = bookId;
    }

    async returnBook(bookId) {
            try {
                // Get CSRF token
                const csrfToken = document.getElementById('csrf-token').value;
                
                const response = await fetch('/api/return', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        bookId,
                        userType: 'member'
                    })
                });
            
            if (response.ok) {
                await this.loadData(); // Reload data
                this.showNotification('✅ Book returned successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error returning book'}`, 'error');
            }
        } catch (error) {
            console.error('Error returning book:', error);
            this.showNotification('❌ Error returning book', 'error');
        }
    }

    showMemberReturnModal(memberId) {
        const member = this.members.find(m => m.id === memberId);
        const borrowedBooks = this.books.filter(book => book.borrowedById === memberId);
        
        if (borrowedBooks.length === 0) {
            this.showNotification('No books to return', 'info');
            return;
        }
        
        const modal = document.getElementById('member-return-modal');
        const returnList = document.getElementById('member-return-list');
        
        returnList.innerHTML = `
            <h3>Return books for ${member.name}:</h3>
            ${borrowedBooks.map(book => `
                <label for="return-${book.id}">
                    <input type="checkbox" id="return-${book.id}" value="${book.id}">
                    <span>${book.title} by ${book.author}</span>
                </label>
            `).join('')}
        `;
        
        modal.style.display = 'flex';
        
        // Setup return form
        const returnForm = document.getElementById('member-return-form');
        returnForm.onsubmit = async (e) => {
            e.preventDefault();
            const selectedBooks = Array.from(returnList.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedBooks.length === 0) {
                this.showNotification('Please select at least one book to return', 'error');
                return;
            }
            
            for (const bookId of selectedBooks) {
                await this.returnBook(bookId);
            }
            
            modal.style.display = 'none';
            await this.loadData();
        };
        
        // Setup cancel button
        document.getElementById('member-return-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Setup select all button
        document.getElementById('member-return-select-all').onclick = () => {
            const checkboxes = returnList.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        };
    }



    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        // Add icon based on type
        let icon = '';
        switch(type) {
            case 'success':
                icon = '✅';
                break;
            case 'error':
                icon = '❌';
                break;
            case 'warning':
                icon = '⚠️';
                break;
            default:
                icon = 'ℹ️';
        }
        
        notification.innerHTML = `<span class="notification-icon">${icon}</span>${message}`;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.animation = '';
            }, 400);
        }, 4000);
    }
}

// Initialize the library system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LibrarySystem();
});
