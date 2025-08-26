// Original library-system.js code before any changes

class LibrarySystem {
    constructor() {
        this.books = [];
        this.members = [];
        this.render();
        this.setupEventListeners();
        this._pendingBorrowBookId = null;
        this._setupBorrowModal();
        this._setupMemberSearch();
    }

    async fetchBooks() {
        const res = await fetch('/api/books');
        this.books = await res.json();
    }

    async fetchMembers() {
        const res = await fetch('/api/members');
        this.members = await res.json();
    }

    async render() {
        await this.fetchBooks();
        await this.fetchMembers();
        this.renderBooks();
        this.renderMembers();
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
            if (book.borrowedById) {
                const member = this.members.find(m => m.id === book.borrowedById);
                borrowedByTd.textContent = member ? member.name : 'Unknown';
                borrowedByTd.classList.add('borrowed');
            } else {
                borrowedByTd.textContent = '';
            }
            tr.appendChild(borrowedByTd);
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn', 'action-btn');
            editBtn.addEventListener('click', () => this.editBook(book.id));
            actionsTd.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn', 'action-btn');
            deleteBtn.addEventListener('click', () => this.deleteBook(book.id));
            actionsTd.appendChild(deleteBtn);
            if (!book.borrowedById) {
                const borrowBtn = document.createElement('button');
                borrowBtn.textContent = 'Borrow';
                borrowBtn.classList.add('borrow-btn', 'action-btn');
                borrowBtn.addEventListener('click', () => this.borrowBook(book.id));
                actionsTd.appendChild(borrowBtn);
            } else {
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

    async renderMembers() {
        const tbody = document.querySelector('#members-table tbody');
        tbody.innerHTML = '';
        this.members.forEach((member, idx) => {
            const tr = document.createElement('tr');
            const numberTd = document.createElement('td');
            numberTd.textContent = (idx + 1).toString();
            tr.appendChild(numberTd);
            const nameTd = document.createElement('td');
            nameTd.textContent = member.name;
            tr.appendChild(nameTd);
            const borrowedBooksTd = document.createElement('td');
            const borrowedBooks = this.books.filter(b => b.borrowedById === member.id && b.borrowedByType === 'member');
            const borrowedBooksSpans = borrowedBooks
                .map(book => {
                    const span = document.createElement('span');
                    span.textContent = book.title;
                    span.classList.add('member-borrowed');
                    return span.outerHTML;
                })
                .join(', ');
            borrowedBooksTd.innerHTML = borrowedBooksSpans;
            tr.appendChild(borrowedBooksTd);
            const actionsTd = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn', 'action-btn');
            editBtn.addEventListener('click', () => this.editMember(member.id));
            actionsTd.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn', 'action-btn');
            deleteBtn.addEventListener('click', () => this.deleteMember(member.id));
            actionsTd.appendChild(deleteBtn);
            
            // Add return button if member has more than 1 borrowed book
            if (borrowedBooks.length > 1) {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return';
                returnBtn.classList.add('return-btn', 'action-btn');
                returnBtn.addEventListener('click', () => this.handleMemberReturn(member.id));
                actionsTd.appendChild(returnBtn);
            }
            
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });
    }

    setupEventListeners() {
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
        document.getElementById('member-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('member-id').value;
            const name = document.getElementById('member-name').value.trim();
            if (!name) return;
            if (id) {
                await fetch(`/api/members/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
            } else {
                await fetch('/api/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
            }
            document.getElementById('member-form').reset();
            document.getElementById('member-cancel-btn').style.display = 'none';
            await this.render();
        });
        document.getElementById('member-cancel-btn').addEventListener('click', () => {
            document.getElementById('member-form').reset();
            document.getElementById('member-cancel-btn').style.display = 'none';
        });
        // Staff button navigation
        const staffBtn = document.getElementById('staff-btn');
        if (staffBtn) {
            staffBtn.addEventListener('click', () => {
                window.location.href = 'staff.html';
            });
        }
        // Book History button navigation
        const historyBtn = document.getElementById('book-history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                window.location.href = 'book-history.html';
            });
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

    async editMember(id) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            document.getElementById('member-id').value = member.id;
            document.getElementById('member-name').value = member.name;
            document.getElementById('member-cancel-btn').style.display = 'inline-block';
        }
    }

    async deleteMember(id) {
        const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await this.render();
        } else {
            const error = await response.json();
            this.showNotification(error.error, 'error');
        }
    }

    async borrowBook(bookId) {
        this._pendingBorrowBookId = bookId;
        const modal = document.getElementById('borrow-modal');
        modal.style.display = 'flex';
        const input = document.getElementById('borrow-member-name');
        input.value = '';
        input.focus();
    }

    async _confirmBorrow(bookId, memberName) {
        const member = this.members.find(m => m.name.toLowerCase() === memberName.toLowerCase());
        if (!member) {
            this.showNotification('Member not found.', 'error');
            return;
        }
        await fetch('/api/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, userType: 'member', userId: member.id, name: member.name })
        });
        document.getElementById('borrow-modal').style.display = 'none';
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

    _setupBorrowModal() {
        const modal = document.getElementById('borrow-modal');
        const form = document.getElementById('borrow-form');
        const cancelBtn = document.getElementById('borrow-cancel-btn');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('borrow-member-name');
            const memberName = input.value.trim();
            if (!memberName) return;
            modal.style.display = 'none';
            input.value = '';
            if (this._pendingBorrowBookId !== null) {
                this._confirmBorrow(this._pendingBorrowBookId, memberName);
                this._pendingBorrowBookId = null;
            }
        });
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('borrow-member-name').value = '';
            this._pendingBorrowBookId = null;
        });
    }

    _setupMemberSearch() {
        const searchInput = document.getElementById('member-search');
        let suggestionBox = null;
        searchInput.addEventListener('input', (e) => {
            const value = searchInput.value.trim().toLowerCase();
            if (suggestionBox) suggestionBox.remove();
            if (!value) return;
            const matches = this.members
                .map((m, idx) => ({
                    idx,
                    name: m.name,
                    display: `${idx + 1}. ${m.name}`
                }))
                .filter(m => m.name.toLowerCase().includes(value));
            if (matches.length === 0) return;
            suggestionBox = document.createElement('div');
            suggestionBox.style.position = 'absolute';
            suggestionBox.style.background = '#fff';
            suggestionBox.style.border = '1px solid #bbb';
            suggestionBox.style.borderRadius = '6px';
            suggestionBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            suggestionBox.style.zIndex = 5000;
            suggestionBox.style.marginTop = '2px';
            suggestionBox.style.minWidth = searchInput.offsetWidth + 'px';
            suggestionBox.style.maxHeight = '180px';
            suggestionBox.style.overflowY = 'auto';
            matches.forEach(m => {
                const item = document.createElement('div');
                item.textContent = m.display;
                item.style.padding = '7px 12px';
                item.style.cursor = 'pointer';
                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    searchInput.value = '';
                    suggestionBox.remove();
                    this._scrollToAndHighlightMember(m.idx);
                });
                suggestionBox.appendChild(item);
            });
            searchInput.parentNode.appendChild(suggestionBox);
            // Position suggestion box
            const rect = searchInput.getBoundingClientRect();
            suggestionBox.style.left = searchInput.offsetLeft + 'px';
            suggestionBox.style.top = (searchInput.offsetTop + searchInput.offsetHeight) + 'px';
        });
        document.addEventListener('click', (e) => {
            if (suggestionBox && !searchInput.contains(e.target) && !suggestionBox.contains(e.target)) {
                suggestionBox.remove();
            }
        });
    }

    _scrollToAndHighlightMember(idx) {
        const tbody = document.querySelector('#members-table tbody');
        const rows = tbody.querySelectorAll('tr');
        if (idx < 0 || idx >= rows.length) return;
        const row = rows[idx];
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('member-glow');
        setTimeout(() => {
            row.classList.remove('member-glow');
        }, 2000);
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

    handleMemberReturn(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        const borrowedBooks = this.books.filter(b => b.borrowedById === memberId && b.borrowedByType === 'member');
        if (borrowedBooks.length === 0) return;
        
        if (borrowedBooks.length === 1) {
            // If only one book, return it directly
            this.returnBook(borrowedBooks[0].id);
            return;
        }
        
        // More than one book, show modal with checkboxes
        const modal = document.getElementById('member-return-modal');
        const listDiv = document.getElementById('member-return-list');
        listDiv.innerHTML = '';
        
        borrowedBooks.forEach(book => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = book.id;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + book.title));
            listDiv.appendChild(label);
        });
        
        modal.style.display = 'flex';
        
        // Set up select all button
        document.getElementById('member-return-select-all').onclick = () => {
            listDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        };
        
        // Set up cancel button
        document.getElementById('member-return-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Set up form submission
        document.getElementById('member-return-form').onsubmit = async (e) => {
            e.preventDefault();
            const checked = Array.from(listDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
            
            // Return all selected books
            for (const bookId of checked) {
                await this.returnBook(bookId);
            }
            
            modal.style.display = 'none';
        };
    }

    returnAllBooksForMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member || member.borrowedBookIds.length === 0) return;
        member.borrowedBookIds.forEach(bookId => {
            const book = this.books.find(b => b.id === bookId);
            if (book) book.borrowedByMemberId = null;
        });
        member.borrowedBookIds = [];
        this.saveToStorage();
        this.renderBooks();
        this.renderMembers();
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new LibrarySystem();
});
