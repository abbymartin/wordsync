let wordlist = [];
let filteredWordlist = [];
let currentFileName = 'wordlist.dict';
let hasChanges = false;
let sortDirection = { word: 1, score: 1 };
let currentPage = 1;
let itemsPerPage = 100;
let isSearchActive = false;
let searchDebounceTimer = null;

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.dict';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const elements = {
    loadBtn: document.getElementById('loadBtn'),
    saveBtn: document.getElementById('saveBtn'),
    searchBox: document.getElementById('searchBox'),
    newWord: document.getElementById('newWord'),
    newScore: document.getElementById('newScore'),
    addBtn: document.getElementById('addBtn'),
    wordTableBody: document.getElementById('wordTableBody'),
    wordCount: document.getElementById('wordCount'),
    fileName: document.getElementById('fileName'),
    fileInfo: document.getElementById('fileInfo'),
    pagination: document.getElementById('pagination'),
    paginationInfo: document.getElementById('paginationInfo'),
    currentPageSpan: document.getElementById('currentPage'),
    totalPagesSpan: document.getElementById('totalPages'),
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    itemsPerPageSelect: document.getElementById('itemsPerPage'),
    filterSection: document.getElementById('filterSection'),
    minLength: document.getElementById('minLength'),
    maxLength: document.getElementById('maxLength'),
    minScore: document.getElementById('minScore'),
    maxScore: document.getElementById('maxScore'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn')
};

function loadFile() {
    fileInput.click();
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const content = await file.text();

        wordlist = content.trim().split('\n').map(line => {
            const [word, score] = line.split(';');
            return {
                word: word.trim(),
                score: parseInt(score) || 0
            };
        }).filter(item => item.word);

        filteredWordlist = [...wordlist];
        hasChanges = false;
        currentFileName = file.name;
        currentPage = 1;
        isSearchActive = false;

        elements.fileName.textContent = file.name;
        elements.fileInfo.style.display = 'block';
        enableControls();
        renderTable();
        updateStats();
        updatePagination();
    } catch (error) {
        alert('Error loading file: ' + error.message);
    }
});

function saveFile() {
    const content = wordlist
        .map(item => `${item.word};${item.score}`)
        .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hasChanges = false;
    elements.saveBtn.disabled = true;
    alert('File downloaded! Replace your original wordlist.dict file with the downloaded file.');
}

function enableControls() {
    elements.searchBox.disabled = false;
    elements.newWord.disabled = false;
    elements.newScore.disabled = false;
    elements.addBtn.disabled = false;
    elements.filterSection.style.display = 'flex';
}

function clearFilters() {
    elements.searchBox.value = '';
    elements.minLength.value = '';
    elements.maxLength.value = '';
    elements.minScore.value = '';
    elements.maxScore.value = '';
    applyFilter();
}

function markChanged() {
    hasChanges = true;
    elements.saveBtn.disabled = false;
}

function addWord() {
    const word = elements.newWord.value.trim().toUpperCase();
    const score = parseInt(elements.newScore.value) || 50;

    if (!word) {
        alert('Please enter a word');
        return;
    }

    const existingIndex = wordlist.findIndex(item => item.word === word);
    if (existingIndex !== -1) {
        alert('Word already exists in the list');
        return;
    }

    wordlist.push({ word, score });
    wordlist.sort((a, b) => a.word.localeCompare(b.word));

    elements.newWord.value = '';
    elements.newScore.value = '50';

    markChanged();
    applyFilter();
    updateStats();
    updatePagination();
}

function deleteWord(word) {
    if (!confirm(`Delete "${word}"?`)) return;

    const index = wordlist.findIndex(item => item.word === word);
    if (index !== -1) {
        wordlist.splice(index, 1);
        markChanged();
        applyFilter();
        updateStats();
        updatePagination();
    }
}

function updateScore(word, newScore) {
    const item = wordlist.find(item => item.word === word);
    if (item) {
        item.score = parseInt(newScore) || 0;
        markChanged();
    }
}

function applyFilter() {
    const searchTerm = elements.searchBox.value.toUpperCase();
    const minLen = parseInt(elements.minLength.value) || 0;
    const maxLen = parseInt(elements.maxLength.value) || Infinity;
    const minScr = parseInt(elements.minScore.value) || 0;
    const maxScr = parseInt(elements.maxScore.value) || 100;

    isSearchActive = searchTerm.length > 0 || minLen > 0 || maxLen < Infinity ||
                     minScr > 0 || maxScr < 100;

    filteredWordlist = wordlist.filter(item => {
        const matchesSearch = item.word.includes(searchTerm);
        const matchesLength = item.word.length >= minLen && item.word.length <= maxLen;
        const matchesScore = item.score >= minScr && item.score <= maxScr;

        return matchesSearch && matchesLength && matchesScore;
    });

    currentPage = 1;
    renderTable();
    updatePagination();
}

function debouncedSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        applyFilter();
    }, 300);
}

function sortTable(column) {
    sortDirection[column] *= -1;

    filteredWordlist.sort((a, b) => {
        if (column === 'word') {
            return a.word.localeCompare(b.word) * sortDirection[column];
        } else {
            return (a.score - b.score) * sortDirection[column];
        }
    });

    renderTable();
    updatePagination();
}

function renderTable() {
    if (filteredWordlist.length === 0) {
        elements.wordTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="no-results">No words found</td>
            </tr>
        `;
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToRender = filteredWordlist.slice(startIndex, endIndex);

    elements.wordTableBody.innerHTML = itemsToRender.map(item => `
        <tr>
            <td class="word-cell">${item.word}</td>
            <td>
                <input
                    type="number"
                    class="score-input"
                    value="${item.score}"
                    min="0"
                    max="100"
                    data-word="${item.word}"
                >
            </td>
            <td class="actions">
                <button class="btn btn-danger" data-delete="${item.word}">Delete</button>
            </td>
        </tr>
    `).join('');

    attachEventListeners();
}

function attachEventListeners() {
    document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('change', (e) => {
            updateScore(e.target.dataset.word, e.target.value);
        });
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteWord(e.target.dataset.delete);
        });
    });
}

function updateStats() {
    elements.wordCount.textContent = `${wordlist.length} words`;
}

function updatePagination() {
    elements.pagination.style.display = 'flex';

    const totalPages = Math.ceil(filteredWordlist.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredWordlist.length);

    let infoText = `Showing ${startIndex}-${endIndex} of ${filteredWordlist.length}`;
    if (isSearchActive) {
        infoText += ` matching words (${wordlist.length} total)`;
    } else {
        infoText += ' words';
    }

    elements.paginationInfo.textContent = infoText;
    elements.currentPageSpan.textContent = currentPage;
    elements.totalPagesSpan.textContent = totalPages;

    elements.firstPageBtn.disabled = currentPage === 1;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages;
    elements.lastPageBtn.disabled = currentPage === totalPages;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredWordlist.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(page, totalPages));
    renderTable();
    updatePagination();
}

function changeItemsPerPage(newItemsPerPage) {
    itemsPerPage = parseInt(newItemsPerPage);
    currentPage = 1;
    renderTable();
    updatePagination();
}

elements.loadBtn.addEventListener('click', loadFile);
elements.saveBtn.addEventListener('click', saveFile);
elements.addBtn.addEventListener('click', addWord);
elements.searchBox.addEventListener('input', debouncedSearch);

elements.minLength.addEventListener('input', debouncedSearch);
elements.maxLength.addEventListener('input', debouncedSearch);
elements.minScore.addEventListener('input', debouncedSearch);
elements.maxScore.addEventListener('input', debouncedSearch);
elements.clearFiltersBtn.addEventListener('click', clearFilters);

elements.newWord.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWord();
});

document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        sortTable(e.target.dataset.sort);
    });
});

elements.firstPageBtn.addEventListener('click', () => goToPage(1));
elements.prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
elements.nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
elements.lastPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredWordlist.length / itemsPerPage);
    goToPage(totalPages);
});
elements.itemsPerPageSelect.addEventListener('change', (e) => {
    changeItemsPerPage(e.target.value);
});

window.addEventListener('beforeunload', (e) => {
    if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
