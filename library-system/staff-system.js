class StaffSystem {
    constructor() {
        this.staffBooks = [];
        this.staff = [];
        this.currentBorrowBookId = null;
        this.loadData();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Load staff books
            const booksResponse = await fetch('/api/staff-books');
            this.staffBooks = await booksResponse.json();
            
            // Load staff
            const staffResponse = await fetch('/api/staff');
            this.staff = await staffResponse.json();
            
            this.render();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        }
    }

    setupEventListeners() {
        const bookForm = document.getElementById('book-form');
        const staffForm = document.getElementById('staff-form');
        const bookCancelBtn = document.getElementById('book-cancel-btn');
        const staffCancelBtn = document.getElementById('staff-cancel-btn');
        const staffSearch = document.getElementById('staff-search');

        // Staff book form submission
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

        // Staff form submission
        staffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const staffIdInput = document.getElementById('staff-id');
            const nameInput = document.getElementById('staff-name');
            const tscInput = document.getElementById('staff-tsc');
            
            const id = staffIdInput.value ? parseInt(staffIdInput.value) : null;
            const name = nameInput.value.trim();
            const tscNumber = tscInput.value.trim();

            if (id) {
                await this.updateStaff(id, name, tscNumber);
            } else {
                await this.addStaff(name, tscNumber);
            }
            
            staffForm.reset();
            staffIdInput.value = '';
            staffCancelBtn.style.display = 'none';
        });

        // Cancel buttons
        bookCancelBtn.addEventListener('click', () => {
            bookForm.reset();
            document.getElementById('book-id').value = '';
            bookCancelBtn.style.display = 'none';
        });

        staffCancelBtn.addEventListener('click', () => {
            staffForm.reset();
            document.getElementById('staff-id').value = '';
            staffCancelBtn.style.display = 'none';
        });

        // Enhanced search functionality with highlighting
        staffSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            // Clear existing highlights
            document.querySelectorAll('.search-highlight').forEach(el => {
                el.classList.remove('search-highlight');
            });
            
            if (!searchTerm) {
                // Show all rows
                document.querySelectorAll('#books-table tbody tr, #staff-table tbody tr').forEach(row => {
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
            
            // Filter staff table rows
            document.querySelectorAll('#staff-table tbody tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return; // Skip empty rows
                
                const name = cells[1]?.textContent.toLowerCase() || '';
                const tscNumber = cells[2]?.textContent.toLowerCase() || '';
                const borrowedBooks = cells[3]?.textContent.toLowerCase() || '';
                
                const matches = name.includes(searchTerm) || 
                               tscNumber.includes(searchTerm) || 
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
        
        // Staff borrow modal event listeners
        const staffBorrowForm = document.getElementById('staff-borrow-form');
        const staffBorrowCancelBtn = document.getElementById('staff-borrow-cancel-btn');
        
        staffBorrowForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const staffName = document.getElementById('staff-borrow-name').value.trim();
            if (!staffName) return;
            
            const staffMember = this.staff.find(s => s.name.toLowerCase() === staffName.toLowerCase());
            if (!staffMember) {
                this.showNotification('Staff member not found!', 'error');
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
                                    userType: 'staff',
                                    userId: staffMember.id,
                                    name: staffMember.name
                                })
                            });
                
                if (response.ok) {
                    await this.loadData(); // Reload data
                    this.showNotification('✅ Staff book borrowed successfully!', 'success');
                    // Hide modal
                    document.getElementById('staff-borrow-modal').style.display = 'none';
                } else {
                    const error = await response.json();
                    this.showNotification(`❌ ${error.error || 'Error borrowing staff book'}`, 'error');
                }
            } catch (error) {
                console.error('Error borrowing staff book:', error);
                this.showNotification('❌ Error borrowing staff book', 'error');
            }
        });
        
        staffBorrowCancelBtn.addEventListener('click', () => {
            document.getElementById('staff-borrow-modal').style.display = 'none';
        });
    }

    render() {
        this.renderBooks();
        this.renderStaff();
    }

    renderBooks() {
        const tbody = document.querySelector('#books-table tbody');
        tbody.innerHTML = '';
        
        this.staffBooks.forEach((book, index) => {
            const tr = document.createElement('tr');
            
            // Number
            const numberTd = document.createElement('td');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);
            
            // Book Number
            const bookNumberTd = document.createElement('td');
            bookNumberTd.textContent = book.bookNumber || 'N/A';
            bookNumberTd.className = 'book-number';
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
                const staff = this.staff.find(s => s.id === book.borrowedById);
                borrowedByTd.textContent = staff ? staff.name : 'Unknown';
                borrowedByTd.className = 'status-borrowed';
            } else {
                borrowedByTd.textContent = 'Available';
                borrowedByTd.className = 'status-available';
            }
            tr.appendChild(borrowedByTd);
            
            // Actions
            const actionsTd = document.createElement('td');
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => this.editBook(book.id);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => this.deleteBook(book.id);
            
            // Borrow/Return button
            const borrowBtn = document.createElement('button');
            if (book.borrowedById) {
                borrowBtn.textContent = 'Return';
                borrowBtn.className = 'btn-return';
                borrowBtn.onclick = () => this.returnBook(book.id);
            } else {
                borrowBtn.textContent = 'Borrow';
                borrowBtn.className = 'btn-borrow';
                borrowBtn.onclick = () => this.borrowBook(book.id);
            }
            
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            actionsTd.appendChild(borrowBtn);
            tr.appendChild(actionsTd);
            
            tbody.appendChild(tr);
        });
        
        // Add empty state if no books
        if (this.staffBooks.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 6;
            emptyCell.className = 'empty-state';
            emptyCell.textContent = 'No staff books found';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        }
    }

    renderStaff() {
        const tbody = document.querySelector('#staff-table tbody');
        tbody.innerHTML = '';
        
        this.staff.forEach((staffMember, index) => {
            const tr = document.createElement('tr');
            
            // Number
            const numberTd = document.createElement('td');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);
            
            // Name
            const nameTd = document.createElement('td');
            nameTd.textContent = staffMember.name;
            tr.appendChild(nameTd);
            
            // TSC Number
            const tscTd = document.createElement('td');
            tscTd.textContent = staffMember.tscNumber;
            tr.appendChild(tscTd);
            
            // Borrowed Books
            const borrowedBooksTd = document.createElement('td');
            const borrowedBooks = this.staffBooks.filter(book => book.borrowedById === staffMember.id);
            borrowedBooksTd.textContent = borrowedBooks.length;
            tr.appendChild(borrowedBooksTd);
            
            // Actions
            const actionsTd = document.createElement('td');
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => this.editStaff(staffMember.id);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => this.deleteStaff(staffMember.id);
            
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            
            // Return Books button (only if they have more than 1 borrowed book)
            if (borrowedBooks.length > 1) {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return Books';
                returnBtn.className = 'btn-return';
                returnBtn.onclick = () => this.showStaffReturnModal(staffMember.id);
                actionsTd.appendChild(returnBtn);
            }
            tr.appendChild(actionsTd);
            
            tbody.appendChild(tr);
        });
        
        // Add empty state if no staff
        if (this.staff.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.className = 'empty-state';
            emptyCell.textContent = 'No staff members found';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        }
    }



    async addBook(title, author, bookNumber) {
            try {
                // Get CSRF token
                const csrfToken = document.getElementById('csrf-token').value;
                
                const response = await fetch('/api/staff-books', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ title, author, bookNumber })
                });
            
            if (response.ok) {
                const newBook = await response.json();
                this.staffBooks.push(newBook);
                this.renderBooks();
                this.showNotification('✅ Staff book added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error adding staff book'}`, 'error');
            }
        } catch (error) {
            console.error('Error adding staff book:', error);
            this.showNotification('❌ Error adding staff book', 'error');
        }
    }

    async updateBook(id, title, author, bookNumber) {
        try {
            const response = await fetch(`/api/staff-books/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, bookNumber })
            });
            
            if (response.ok) {
                const updatedBook = await response.json();
                const index = this.staffBooks.findIndex(b => b.id === id);
                if (index !== -1) {
                    this.staffBooks[index] = updatedBook;
                    this.renderBooks();
                    this.showNotification('✅ Staff book updated successfully!', 'success');
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error updating staff book'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating staff book:', error);
            this.showNotification('❌ Error updating staff book', 'error');
        }
    }

    async deleteBook(id) {
        try {
            const response = await fetch(`/api/staff-books/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.staffBooks = this.staffBooks.filter(b => b.id !== id);
                this.renderBooks();
                this.showNotification('✅ Staff book deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error deleting staff book'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting staff book:', error);
            this.showNotification('❌ Error deleting staff book', 'error');
        }
    }

    editBook(id) {
        const book = this.staffBooks.find(b => b.id === id);
        if (book) {
            document.getElementById('book-id').value = book.id;
            document.getElementById('book-title').value = book.title;
            document.getElementById('book-author').value = book.author;
            document.getElementById('book-number').value = book.bookNumber || '';
            document.getElementById('book-cancel-btn').style.display = 'inline';
        }
    }

    async addStaff(name, tscNumber) {
            try {
                // Get CSRF token
                const csrfToken = document.getElementById('csrf-token').value;
                
                const response = await fetch('/api/staff', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ name, tscNumber })
                });
            
            if (response.ok) {
                const newStaff = await response.json();
                this.staff.push(newStaff);
                this.renderStaff();
                this.showNotification('✅ Staff added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error adding staff'}`, 'error');
            }
        } catch (error) {
            console.error('Error adding staff:', error);
            this.showNotification('❌ Error adding staff', 'error');
        }
    }

    async updateStaff(id, name, tscNumber) {
        try {
            const response = await fetch(`/api/staff/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, tscNumber })
            });
            
            if (response.ok) {
                const updatedStaff = await response.json();
                const index = this.staff.findIndex(s => s.id === id);
                if (index !== -1) {
                    this.staff[index] = updatedStaff;
                    this.renderStaff();
                    this.showNotification('✅ Staff updated successfully!', 'success');
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error updating staff'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating staff:', error);
            this.showNotification('❌ Error updating staff', 'error');
        }
    }

    async deleteStaff(id) {
        try {
            const response = await fetch(`/api/staff/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.staff = this.staff.filter(s => s.id !== id);
                this.renderStaff();
                this.showNotification('✅ Staff deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error deleting staff'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
            this.showNotification('❌ Error deleting staff', 'error');
        }
    }

    editStaff(id) {
        const staffMember = this.staff.find(s => s.id === id);
        if (staffMember) {
            document.getElementById('staff-id').value = staffMember.id;
            document.getElementById('staff-name').value = staffMember.name;
            document.getElementById('staff-tsc').value = staffMember.tscNumber;
            document.getElementById('staff-cancel-btn').style.display = 'inline';
        }
    }

    async borrowBook(bookId) {
        // Show our custom styled modal instead of browser prompt
        const modal = document.getElementById('staff-borrow-modal');
        const nameInput = document.getElementById('staff-borrow-name');
        
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
                    userType: 'staff'
                })
            });
            
            if (response.ok) {
                await this.loadData(); // Reload data
                this.showNotification('✅ Staff book returned successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.error || 'Error returning staff book'}`, 'error');
            }
        } catch (error) {
            console.error('Error returning staff book:', error);
            this.showNotification('❌ Error returning staff book', 'error');
        }
    }

    showStaffReturnModal(staffId) {
        const staffMember = this.staff.find(s => s.id === staffId);
        const borrowedBooks = this.staffBooks.filter(book => book.borrowedById === staffId);
        
        if (borrowedBooks.length === 0) {
            this.showNotification('No books to return', 'info');
            return;
        }
        
        const modal = document.getElementById('staff-return-modal');
        const returnList = document.getElementById('staff-return-list');
        
        returnList.innerHTML = `
            <h3>Return books for ${staffMember.name}:</h3>
            ${borrowedBooks.map(book => `
                <label for="return-${book.id}">
                    <input type="checkbox" id="return-${book.id}" value="${book.id}">
                    <span>${book.title} by ${book.author}</span>
                </label>
            `).join('')}
        `;
        
        modal.style.display = 'flex';
        
        // Setup return form
        const returnForm = document.getElementById('staff-return-form');
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
        document.getElementById('staff-return-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Setup select all button
        document.getElementById('staff-return-select-all').onclick = () => {
            const checkboxes = returnList.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        };
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Initialize the staff system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new StaffSystem();
}); 