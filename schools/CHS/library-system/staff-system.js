class StaffLibrarySystem {
    constructor() {
        this.books = [];
        this.staff = [];
        this.render();
        this.setupEventListeners();
        this._pendingBorrowBookId = null;
        this._setupBorrowModal();
        this._setupReturnModal();
    }

    async fetchBooks() {
        const res = await fetch('/api/books');
        this.books = await res.json();
    }

    async fetchStaff() {
        const res = await fetch('/api/staff');
        this.staff = await res.json();
    }

    async render() {
        await this.fetchBooks();
        await this.fetchStaff();
        this.renderBooks();
        this.renderStaff();
    }

    async renderBooks() {
        const tbody = document.querySelector('#books-table tbody');
        tbody.innerHTML = '';
        this.books.forEach((book, idx) => {
            const tr = document.createElement('tr');
            const numberTd = document.createElement('td');
            numberTd.textContent = (idx + 1).toString();
            tr.appendChild(numberTd);
            const bookNumberTd = document.createElement('td');
            bookNumberTd.textContent = book.bookNumber || '';
            bookNumberTd.classList.add('book-number');
            tr.appendChild(bookNumberTd);
            const titleTd = document.createElement('td');
            titleTd.textContent = book.title;
            tr.appendChild(titleTd);
            const authorTd = document.createElement('td');
            authorTd.textContent = book.author;
            tr.appendChild(authorTd);
            const borrowedByTd = document.createElement('td');
            if (book.borrowedByType === 'staff' && book.borrowedById) {
                const staff = this.staff.find(s => s.id === book.borrowedById);
                borrowedByTd.textContent = staff ? staff.name : 'Unknown';
                borrowedByTd.classList.add('borrowed'); // red color
            } else {
                borrowedByTd.textContent = '';
            }
            tr.appendChild(borrowedByTd);
            const actionsTd = document.createElement('td');
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn', 'action-btn');
            editBtn.addEventListener('click', () => this.editBook(book.id));
            actionsTd.appendChild(editBtn);
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn', 'action-btn');
            deleteBtn.addEventListener('click', () => this.deleteBook(book.id));
            actionsTd.appendChild(deleteBtn);
            // Borrow/Return logic
            if (!book.borrowedById) {
                const borrowBtn = document.createElement('button');
                borrowBtn.textContent = 'Borrow';
                borrowBtn.classList.add('borrow-btn', 'action-btn');
                borrowBtn.addEventListener('click', () => this.borrowBook(book.id));
                actionsTd.appendChild(borrowBtn);
            } else if (book.borrowedByType === 'staff') {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return';
                returnBtn.classList.add('action-btn');
                returnBtn.addEventListener('click', () => this.returnBook(book.id));
                actionsTd.appendChild(returnBtn);
                const redMark = document.createElement('span');
                redMark.className = 'borrowed-mark';
                actionsTd.appendChild(redMark);
            }
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
    }

    async renderStaff() {
        const tbody = document.querySelector('#staff-table tbody');
        tbody.innerHTML = '';
        this.staff.forEach((staff, idx) => {
            const tr = document.createElement('tr');
            const numberTd = document.createElement('td');
            numberTd.textContent = (idx + 1).toString();
            tr.appendChild(numberTd);
            const nameTd = document.createElement('td');
            nameTd.textContent = staff.name;
            tr.appendChild(nameTd);
            const borrowedBooksTd = document.createElement('td');
            const borrowedBooks = this.books.filter(b => b.borrowedByType === 'staff' && b.borrowedById === staff.id);
            const borrowedBooksSpans = borrowedBooks
                .map(book => {
                    const span = document.createElement('span');
                    span.textContent = book.title;
                    span.classList.add('staff-borrowed'); // green color
                    return span.outerHTML;
                })
                .join(', ');
            borrowedBooksTd.innerHTML = borrowedBooksSpans;
            tr.appendChild(borrowedBooksTd);
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn', 'action-btn');
            editBtn.addEventListener('click', () => this.editStaff(staff.id));
            actionsTd.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn', 'action-btn');
            deleteBtn.addEventListener('click', () => this.deleteStaff(staff.id));
            actionsTd.appendChild(deleteBtn);
            
            // Add return button if staff has more than 1 borrowed book
            if (borrowedBooks.length > 1) {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return';
                returnBtn.classList.add('return-btn', 'action-btn');
                returnBtn.addEventListener('click', () => this.handleStaffReturn(staff.id));
                actionsTd.appendChild(returnBtn);
            }
            
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
    }

    setupEventListeners() {
        document.getElementById('staff-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('staff-id').value;
            const name = document.getElementById('staff-name').value.trim();
            if (!name) return;
            if (id) {
                await fetch(`/api/staff/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
            } else {
                await fetch('/api/staff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
            }
            document.getElementById('staff-form').reset();
            document.getElementById('staff-cancel-btn').style.display = 'none';
            await this.render();
        });
        document.getElementById('staff-cancel-btn').addEventListener('click', () => {
            document.getElementById('staff-form').reset();
            document.getElementById('staff-cancel-btn').style.display = 'none';
        });
        document.getElementById('book-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('book-id').value;
            const title = document.getElementById('book-title').value.trim();
            const author = document.getElementById('book-author').value.trim();
            const bookNumber = document.getElementById('book-number').value.trim();
            if (!title || !author || !bookNumber) return;
            if (id) {
                await fetch(`/api/books/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, author, bookNumber })
                });
            } else {
                await fetch('/api/books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, author, bookNumber })
                });
            }
            document.getElementById('book-form').reset();
            document.getElementById('book-cancel-btn').style.display = 'none';
            await this.render();
        });
        document.getElementById('book-cancel-btn').addEventListener('click', () => {
            document.getElementById('book-form').reset();
            document.getElementById('book-cancel-btn').style.display = 'none';
        });
    }

    async editStaff(id) {
        const staff = this.staff.find(s => s.id === id);
        if (staff) {
            document.getElementById('staff-id').value = staff.id;
            document.getElementById('staff-name').value = staff.name;
            document.getElementById('staff-cancel-btn').style.display = 'inline-block';
        }
    }

    async deleteStaff(id) {
        const response = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await this.render();
        } else {
            const error = await response.json();
            this.showNotification(error.error, 'error');
        }
    }

    async editBook(id) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            document.getElementById('book-id').value = book.id;
            document.getElementById('book-title').value = book.title;
            document.getElementById('book-author').value = book.author;
            document.getElementById('book-number').value = book.bookNumber || '';
            document.getElementById('book-cancel-btn').style.display = 'inline-block';
        }
    }

    async deleteBook(id) {
        const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await this.render();
        } else {
            const error = await response.json();
            this.showNotification(error.error, 'error');
        }
    }

    async borrowBook(bookId) {
        this._pendingBorrowBookId = bookId;
        const modal = document.getElementById('staff-borrow-modal');
        modal.style.display = 'flex';
        const input = document.getElementById('staff-borrow-name');
        input.value = '';
        input.focus();
    }

    _setupBorrowModal() {
        const modal = document.getElementById('staff-borrow-modal');
        const form = document.getElementById('staff-borrow-form');
        const cancelBtn = document.getElementById('staff-borrow-cancel-btn');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('staff-borrow-name');
            const staffName = input.value.trim();
            if (!staffName) return;
            modal.style.display = 'none';
            input.value = '';
            if (this._pendingBorrowBookId !== null) {
                try {
                    await this._confirmBorrow(this._pendingBorrowBookId, staffName);
                } catch (err) {
                    this.showNotification('Failed to borrow book.', 'error');
                }
                this._pendingBorrowBookId = null;
            }
        });
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('staff-borrow-name').value = '';
            this._pendingBorrowBookId = null;
        });
    }

    async _confirmBorrow(bookId, staffName) {
        const staff = this.staff.find(s => s.name.toLowerCase() === staffName.toLowerCase());
        if (!staff) {
            this.showNotification('Staff not found.', 'error');
            return;
        }
        await fetch('/api/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, userType: 'staff', userId: staff.id, name: staff.name })
        });
        document.getElementById('staff-borrow-modal').style.display = 'none';
        await this.render();
    }

    async returnBook(bookId) {
        await fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId })
        });
        await this.render();
    }

    handleStaffReturn(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) return;
        
        const borrowedBooks = this.books.filter(b => b.borrowedById === staffId && b.borrowedByType === 'staff');
        if (borrowedBooks.length === 0) return;
        
        if (borrowedBooks.length === 1) {
            // If only one book, return it directly
            this.returnBook(borrowedBooks[0].id);
            return;
        }
        
        // More than one book, show modal with checkboxes
        const modal = document.getElementById('staff-return-modal');
        const listDiv = document.getElementById('staff-return-list');
        listDiv.innerHTML = '';
        
        borrowedBooks.forEach(book => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = book.id;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + (book ? book.title : 'Unknown')));
            listDiv.appendChild(label);
        });
        modal.style.display = 'flex';
        document.getElementById('staff-return-select-all').onclick = () => {
            listDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        };
        document.getElementById('staff-return-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        document.getElementById('staff-return-form').onsubmit = async (e) => {
            e.preventDefault();
            const checked = Array.from(listDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            checked.forEach(bookId => this.returnBook(Number(bookId)));
            modal.style.display = 'none';
        };
    }

    showNotification(message, type = '') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = type ? `error ${type === 'error' ? 'error' : 'success'}` : '';
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2000);
    }

    _setupReturnModal() {
        const modal = document.getElementById('staff-return-modal');
        const cancelBtn = document.getElementById('staff-return-cancel');
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new StaffLibrarySystem();
}); 