interface Book {
    id: number;
    title: string;
    author: string;
    borrowedByMemberId: number | null;
}

interface Member {
    id: number;
    name: string;
    borrowedBookIds: number[];
}

class LibrarySystem {
    private books: Book[] = [];
    private members: Member[] = [];
    private bookIdCounter = 1;
    private memberIdCounter = 1;

    constructor() {
        this.loadFromStorage();
        this.render();
        this.setupEventListeners();
    }

private setupEventListeners() {
        const bookForm = document.getElementById('book-form') as HTMLFormElement;
        const memberForm = document.getElementById('member-form') as HTMLFormElement;
        const bookCancelBtn = document.getElementById('book-cancel-btn') as HTMLButtonElement;
        const memberCancelBtn = document.getElementById('member-cancel-btn') as HTMLButtonElement;

     bookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookIdInput = document.getElementById('book-id') as HTMLInputElement;
            const titleInput = document.getElementById('book-title') as HTMLInputElement;
            const authorInput = document.getElementById('book-author') as HTMLInputElement;

            const id = bookIdInput.value ? parseInt(bookIdInput.value) : null;
            const title = titleInput.value.trim();
            const author = authorInput.value.trim();

            if (id) {
                this.updateBook(id, title, author);
            } else {
                this.addBook(title, author);
            }

            bookForm.reset();
            bookIdInput.value = '';
            bookCancelBtn.style.display = 'none';
        });

    bookCancelBtn.addEventListener('click', () => {
            bookForm.reset();
            (document.getElementById('book-id') as HTMLInputElement).value = '';
            bookCancelBtn.style.display = 'none';
        });

     memberForm.addEventListener('submit', (e) => {
         e.preventDefault();
            const memberIdInput = document.getElementById('member-id') as HTMLInputElement;
            const nameInput = document.getElementById('member-name') as HTMLInputElement;

            const id = memberIdInput.value ? parseInt(memberIdInput.value) : null;
            const name = nameInput.value.trim();

            if (id) {
                this.updateMember(id, name);
            } else {
                this.addMember(name);
            }

            memberForm.reset();
            memberIdInput.value = '';
            memberCancelBtn.style.display = 'none';
        });

    memberCancelBtn.addEventListener('click', () => {
            memberForm.reset();
            (document.getElementById('member-id') as HTMLInputElement).value = '';
            memberCancelBtn.style.display = 'none';
        });
    }

    private saveToStorage() {
        localStorage.setItem('books', JSON.stringify(this.books));
        localStorage.setItem('members', JSON.stringify(this.members));
        localStorage.setItem('bookIdCounter', this.bookIdCounter.toString());
        localStorage.setItem('memberIdCounter', this.memberIdCounter.toString());
    }

    private loadFromStorage() {
        const booksData = localStorage.getItem('books');
        const membersData = localStorage.getItem('members');
        const bookIdCounterData = localStorage.getItem('bookIdCounter');
        const memberIdCounterData = localStorage.getItem('memberIdCounter');

        if (booksData) this.books = JSON.parse(booksData);
        if (membersData) this.members = JSON.parse(membersData);
        if (bookIdCounterData) this.bookIdCounter = parseInt(bookIdCounterData);
        if (memberIdCounterData) this.memberIdCounter = parseInt(memberIdCounterData);
    }

    private render() {
        this.renderBooks();
        this.renderMembers();
    }

    private renderBooks() {
        const tbody = document.querySelector('#books-table tbody')!;
        tbody.innerHTML = '';

        this.books.forEach(book => {
            const tr = document.createElement('tr');

            const titleTd = document.createElement('td');
            titleTd.textContent = book.title;
            tr.appendChild(titleTd);

            const authorTd = document.createElement('td');
            authorTd.textContent = book.author;
            tr.appendChild(authorTd);

            const borrowedByTd = document.createElement('td');
            if (book.borrowedByMemberId !== null) {
                const member = this.members.find(m => m.id === book.borrowedByMemberId);
                borrowedByTd.textContent = member ? member.name : 'Unknown';
                borrowedByTd.classList.add('borrowed');
            } else {
                borrowedByTd.textContent = '';
            }
            tr.appendChild(borrowedByTd);

            const actionsTd = document.createElement('td');

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => this.editBook(book.id));
            actionsTd.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => this.deleteBook(book.id));
            actionsTd.appendChild(deleteBtn);

            if (book.borrowedByMemberId === null) {
                const borrowBtn = document.createElement('button');
                borrowBtn.textContent = 'Borrow';
                borrowBtn.addEventListener('click', () => this.borrowBook(book.id));
                actionsTd.appendChild(borrowBtn);
            } else {
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Return';
                returnBtn.addEventListener('click', () => this.returnBook(book.id));
                actionsTd.appendChild(returnBtn);
            }

            tr.appendChild(actionsTd);

            tbody.appendChild(tr);
        });
    }

    private renderMembers() {
        const tbody = document.querySelector('#members-table tbody')!;
        tbody.innerHTML = '';

        this.members.forEach(member => {
            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.textContent = member.name;
            tr.appendChild(nameTd);

            const borrowedBooksTd = document.createElement('td');
            const borrowedBooksTitles = member.borrowedBookIds
                .map(bookId => {
                    const book = this.books.find(b => b.id === bookId);
                    return book ? book.title : 'Unknown';
                })
                .join(', ');
            borrowedBooksTd.textContent = borrowedBooksTitles;
            tr.appendChild(borrowedBooksTd);

            const actionsTd = document.createElement('td');

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => this.editMember(member.id));
            actionsTd.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => this.deleteMember(member.id));
            actionsTd.appendChild(deleteBtn);

            tr.appendChild(actionsTd);

            tbody.appendChild(tr);
        });
    }

    private addBook(title: string, author: string) {
        const newBook: Book = {
            id: this.bookIdCounter++,
            title,
            author,
            borrowedByMemberId: null,
        };
        this.books.push(newBook);
        this.saveToStorage();
        this.renderBooks();
    }

    private updateBook(id: number, title: string, author: string) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            book.title = title;
            book.author = author;
            this.saveToStorage();
            this.renderBooks();
        }
    }

    private deleteBook(id: number) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            if (book.borrowedByMemberId !== null) {
                alert('Cannot delete a book that is currently borrowed.');
                return;
            }
            this.books = this.books.filter(b => b.id !== id);
            this.saveToStorage();
            this.renderBooks();
            this.renderMembers();
        }
    }

    private editBook(id: number) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            (document.getElementById('book-id') as HTMLInputElement).value = book.id.toString();
            (document.getElementById('book-title') as HTMLInputElement).value = book.title;
            (document.getElementById('book-author') as HTMLInputElement).value = book.author;
            (document.getElementById('book-cancel-btn') as HTMLButtonElement).style.display = 'inline-block';
        }
    }

    private addMember(name: string) {
        const newMember: Member = {
            id: this.memberIdCounter++,
            name,
            borrowedBookIds: [],
        };
        this.members.push(newMember);
        this.saveToStorage();
        this.renderMembers();
    }

    private updateMember(id: number, name: string) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            member.name = name;
            this.saveToStorage();
            this.renderMembers();
            this.renderBooks();
        }
    }

    private deleteMember(id: number) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            if (member.borrowedBookIds.length > 0) {
                alert('Cannot delete a member who currently has borrowed books.');
                return;
            }
            this.members = this.members.filter(m => m.id !== id);
            this.saveToStorage();
            this.renderMembers();
            this.renderBooks();
        }
    }

    private editMember(id: number) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            (document.getElementById('member-id') as HTMLInputElement).value = member.id.toString();
            (document.getElementById('member-name') as HTMLInputElement).value = member.name;
            (document.getElementById('member-cancel-btn') as HTMLButtonElement).style.display = 'inline-block';
        }
    }

    private borrowBook(bookId: number) {
        const book = this.books.find(b => b.id === bookId);
        if (!book || book.borrowedByMemberId !== null) {
            alert('Book is not available for borrowing.');
            return;
        }

        const memberName = prompt('Enter member name to borrow this book:');
        if (!memberName) return;

        const member = this.members.find(m => m.name.toLowerCase() === memberName.trim().toLowerCase());
        if (!member) {
            alert('Member not found.');
            return;
        }

        book.borrowedByMemberId = member.id;
        member.borrowedBookIds.push(book.id);

        this.saveToStorage();
        this.renderBooks();
        this.renderMembers();
    }

    private returnBook(bookId: number) {
        const book = this.books.find(b => b.id === bookId);
        if (!book || book.borrowedByMemberId === null) {
            alert('Book is not currently borrowed.');
            return;
        }

        const member = this.members.find(m => m.id === book.borrowedByMemberId);
        if (member) {
            member.borrowedBookIds = member.borrowedBookIds.filter(id => id !== book.id);
        }
        book.borrowedByMemberId = null;

        this.saveToStorage();
        this.renderBooks();
        this.renderMembers();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new LibrarySystem();
});
