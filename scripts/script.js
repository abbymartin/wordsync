let wordlist = [];
let filteredWordlist = [];
let currentFileName = 'wordlist.dict';
let hasChanges = false;
let sortDirection = { word: 1, score: 1 };
let currentPage = 1;
let itemsPerPage = 100;
let isSearchActive = false;
let searchDebounceTimer = null;
let isGitHubMode = false;

const SEARCH_DEBOUNCE_MS = 300;

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.dict, .txt';
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
    pagination: document.getElementById('pagination'),
    paginationInfo: document.getElementById('paginationInfo'),
    currentPageSpan: document.getElementById('currentPage'),
    totalPagesSpan: document.getElementById('totalPages'),
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    itemsPerPageSelect: document.getElementById('itemsPerPage'),
    minLength: document.getElementById('minLength'),
    maxLength: document.getElementById('maxLength'),
    minScore: document.getElementById('minScore'),
    maxScore: document.getElementById('maxScore'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    githubRepoOwner: document.getElementById('githubRepoOwner'),
    githubRepoName: document.getElementById('githubRepoName'),
    githubBranch: document.getElementById('githubBranch'),
    githubToken: document.getElementById('githubToken'),
    saveTokenBtn: document.getElementById('saveTokenBtn'),
    clearTokenBtn: document.getElementById('clearTokenBtn'),
    githubFilePath: document.getElementById('githubFilePath'),
    settingsStatus: document.getElementById('settingsStatus'),
    modeToggle: document.getElementById('modeToggle'),
    githubSettingsBtn: document.getElementById('githubSettingsBtn'),
    filterToggleBtn: document.getElementById('filterToggleBtn'),
    addToggleBtn: document.getElementById('addToggleBtn'),
    filterPanel: document.getElementById('filterPanel'),
    addWordPanel: document.getElementById('addWordPanel')
};

function toggleMode() {
    isGitHubMode = elements.modeToggle.checked;

    if (isGitHubMode) {
        elements.githubSettingsBtn.style.display = 'inline-block';
        elements.loadBtn.classList.remove('btn-local');
        elements.loadBtn.classList.add('btn-github');
        elements.saveBtn.classList.remove('btn-local');
        elements.saveBtn.classList.add('btn-github');
    } else {
        elements.githubSettingsBtn.style.display = 'none';
        elements.settingsPanel.style.display = 'none';
        elements.loadBtn.classList.remove('btn-github');
        elements.loadBtn.classList.add('btn-local');
        elements.saveBtn.classList.remove('btn-github');
        elements.saveBtn.classList.add('btn-local');
    }
}

function toggleSettings() {
    const panel = elements.settingsPanel;
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function toggleFilterPanel() {
    const filterPanel = elements.filterPanel;
    const addWordPanel = elements.addWordPanel;

    if (filterPanel.style.display === 'none') {
        filterPanel.style.display = 'flex';
        addWordPanel.style.display = 'none';
    } else {
        filterPanel.style.display = 'none';
    }
}

function toggleAddWordPanel() {
    const filterPanel = elements.filterPanel;
    const addWordPanel = elements.addWordPanel;

    if (addWordPanel.style.display === 'none') {
        addWordPanel.style.display = 'flex';
        filterPanel.style.display = 'none';
    } else {
        addWordPanel.style.display = 'none';
    }
}

function initializeWordlist(words, fileName, source) {
    wordlist = words;
    filteredWordlist = [...wordlist];
    hasChanges = false;
    currentFileName = fileName;
    currentPage = 1;
    isSearchActive = false;
    elements.fileName.textContent = `${fileName} ${source}`;
    enableControls();
    renderTable();
    updateStats();
    updatePagination();
}

function loadFile() {
    if (isGitHubMode) {
        loadFromGitHub();
    } else {
        fileInput.click();
    }
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const content = await file.text();

        const words = content.trim().split('\n').map(line => {
            const [word, score] = line.split(';');
            return {
                word: word.trim(),
                score: parseInt(score) || 0
            };
        }).filter(item => item.word);

        initializeWordlist(words, file.name, '(local file)');
    } catch (error) {
        alert('Error loading file: ' + error.message);
    }
});

function saveFile() {
    if (isGitHubMode) {
        pushToGitHub();
    } else {
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
        alert('File downloaded! Replace your original wordlist file with the downloaded file.');
    }
}

function enableControls() {
    elements.searchBox.disabled = false;
    elements.filterToggleBtn.disabled = false;
    elements.addToggleBtn.disabled = false;
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
    }, SEARCH_DEBOUNCE_MS);
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

function showStatus(message, isError = false) {
    elements.settingsStatus.textContent = message;
    elements.settingsStatus.className = 'settings-status ' + (isError ? 'error' : 'success');
    elements.settingsStatus.style.display = 'block';
}

async function saveToken() {
    const token = elements.githubToken.value.trim();
    const repoOwner = elements.githubRepoOwner.value.trim();
    const repoName = elements.githubRepoName.value.trim();
    const filePath = elements.githubFilePath.value.trim();
    const branch = elements.githubBranch.value.trim() || 'main';

    if (!token) {
        showStatus('Please enter a GitHub token', true);
        return;
    }

    if (!repoOwner || !repoName) {
        showStatus('Please enter repository owner and name', true);
        return;
    }

    const api = new GitHubAPI(token, repoOwner, repoName, branch);
    const isValid = await api.validateToken();

    if (!isValid) {
        showStatus('Invalid token. Please check your token and try again.', true);
        return;
    }

    setStoredToken(token);
    setStoredRepoOwner(repoOwner);
    setStoredRepoName(repoName);
    setStoredFilePath(filePath);
    setStoredBranch(branch);
    showStatus('Configuration saved successfully!');
}

function clearToken() {
    clearStoredToken();
    localStorage.removeItem('github_repo_owner');
    localStorage.removeItem('github_repo_name');
    localStorage.removeItem('github_file_path');
    localStorage.removeItem('github_branch');
    elements.githubToken.value = '';
    elements.githubRepoOwner.value = '';
    elements.githubRepoName.value = '';
    elements.githubFilePath.value = 'wordlist.dict';
    elements.githubBranch.value = 'main';
    showStatus('All configuration cleared');
}

async function loadFromGitHub() {
    const token = getStoredToken();
    const repoOwner = getStoredRepoOwner();
    const repoName = getStoredRepoName();
    const filePath = getStoredFilePath();
    const branch = getStoredBranch();

    if (!token || !repoOwner || !repoName) {
        showStatus('Please save your GitHub configuration first', true);
        return;
    }

    elements.loadBtn.classList.add('loading');
    elements.loadBtn.disabled = true;

    try {
        const api = new GitHubAPI(token, repoOwner, repoName, branch);
        const result = await api.loadFromGitHub(filePath);

        const words = result.content.trim().split('\n').map(line => {
            const [word, score] = line.split(';');
            return {
                word: word.trim(),
                score: parseInt(score) || 0
            };
        }).filter(item => item.word);

        initializeWordlist(words, filePath, '(from GitHub)');
        showStatus(`Loaded ${words.length} words from GitHub`);
    } catch (error) {
        showStatus(error.message, true);
    } finally {
        elements.loadBtn.classList.remove('loading');
        elements.loadBtn.disabled = false;
    }
}

async function pushToGitHub() {
    const token = getStoredToken();
    const repoOwner = getStoredRepoOwner();
    const repoName = getStoredRepoName();
    const filePath = getStoredFilePath();
    const branch = getStoredBranch();

    if (!token || !repoOwner || !repoName) {
        showStatus('Please save your GitHub configuration first', true);
        return;
    }

    const commitMessage = prompt('Enter commit message:', 'Update wordlist');
    if (!commitMessage) return;

    elements.saveBtn.classList.add('loading');
    elements.saveBtn.disabled = true;

    try {
        const content = wordlist
            .map(item => `${item.word};${item.score}`)
            .join('\n');

        const api = new GitHubAPI(token, repoOwner, repoName, branch);
        await api.saveToGitHub(filePath, content, commitMessage);

        hasChanges = false;
        showStatus('Successfully pushed to GitHub!');
    } catch (error) {
        showStatus(error.message, true);
    } finally {
        elements.saveBtn.classList.remove('loading');
        elements.saveBtn.disabled = !hasChanges;
    }
}

function initializeGitHub() {
    const token = getStoredToken();
    const repoOwner = getStoredRepoOwner();
    const repoName = getStoredRepoName();
    const filePath = getStoredFilePath();
    const branch = getStoredBranch();

    if (token) {
        elements.githubToken.value = token;
    }

    if (repoOwner) {
        elements.githubRepoOwner.value = repoOwner;
    }

    if (repoName) {
        elements.githubRepoName.value = repoName;
    }

    if (filePath) {
        elements.githubFilePath.value = filePath;
    }

    if (branch) {
        elements.githubBranch.value = branch;
    }
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

elements.modeToggle.addEventListener('change', toggleMode);
elements.githubSettingsBtn.addEventListener('click', toggleSettings);
elements.filterToggleBtn.addEventListener('click', toggleFilterPanel);
elements.addToggleBtn.addEventListener('click', toggleAddWordPanel);

elements.saveTokenBtn.addEventListener('click', saveToken);
elements.clearTokenBtn.addEventListener('click', clearToken);

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

// Initialize mode to Local on page load
elements.modeToggle.checked = false;
isGitHubMode = false;
elements.githubSettingsBtn.style.display = 'none';
elements.loadBtn.classList.add('btn-local');
elements.saveBtn.classList.add('btn-local');

initializeGitHub();
