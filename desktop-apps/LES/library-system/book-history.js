function formatDateTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    // Convert to EAT (UTC+3)
    const eatOffset = 3 * 60; // minutes
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const eatDate = new Date(utc + eatOffset * 60000);
    return eatDate.toLocaleString('en-GB', { hour12: false }) + ' EAT';
}

function daysBetween(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : '';
}

async function renderHistory() {
    const res = await fetch('/api/history');
    const history = await res.json();
    const memberTbody = document.querySelector('#member-history-table tbody');
    const staffTbody = document.querySelector('#staff-history-table tbody');
    memberTbody.innerHTML = '';
    staffTbody.innerHTML = '';
    let memberCount = 1;
    let staffCount = 1;
    history.forEach(entry => {
        const row = document.createElement('tr');
        const noTd = document.createElement('td');
        const nameTd = document.createElement('td');
        const bookTd = document.createElement('td');
        const borrowedTd = document.createElement('td');
        const returnedTd = document.createElement('td');
        const daysTd = document.createElement('td');
        const statusTd = document.createElement('td');
        nameTd.textContent = entry.name;
        bookTd.textContent = entry.bookTitle;
        borrowedTd.textContent = formatDateTime(entry.borrowedAt);
        returnedTd.textContent = formatDateTime(entry.returnedAt);
        daysTd.textContent = entry.returnedAt ? daysBetween(entry.borrowedAt, entry.returnedAt) : '';
        statusTd.textContent = entry.returnedAt ? 'Returned' : 'Borrowed';
        statusTd.style.fontWeight = 'bold';
        statusTd.style.color = entry.returnedAt ? '#16a34a' : '#eab308';
        if (entry.userType === 'member') {
            noTd.textContent = memberCount++;
            row.append(noTd, nameTd, bookTd, borrowedTd, returnedTd, daysTd, statusTd);
            memberTbody.appendChild(row);
        } else if (entry.userType === 'staff') {
            noTd.textContent = staffCount++;
            row.append(noTd, nameTd, bookTd, borrowedTd, returnedTd, daysTd, statusTd);
            staffTbody.appendChild(row);
        }
    });
}

document.addEventListener('DOMContentLoaded', renderHistory); 