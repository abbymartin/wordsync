const DEFAULT_BRANCH = 'main';
const TOKEN_ENDPOINT = '/api/github/get-token';

class GitHubAPI {
    constructor(repoOwner, repoName, branch = DEFAULT_BRANCH) {
        this.repoOwner = repoOwner;
        this.repoName = repoName;
        this.branch = branch;
        this.cachedToken = null;
        this.tokenExpiry = null;
    }

    async getToken() {
        // Return cached token if still valid
        if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        // Get new token
        const response = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }

        const data = await response.json();
        this.cachedToken = data.token;
        this.tokenExpiry = Date.now() + (data.expiresIn * 1000) - 60000; // Expire 1 min early

        return this.cachedToken;
    }

    async request(path, options = {}) {
        const token = await this.getToken();

        // Make request directly to GitHub API
        const response = await fetch(`https://api.github.com${path}`, {
            method: options.method || 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    async validateSession() {
        try {
            await this.request('/user');
            return true;
        } catch (error) {
            return false;
        }
    }

    async loadFromGitHub(filePath) {
        try {
            const refData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/ref/heads/${this.branch}`
            );
            const commitSha = refData.object.sha;

            const commitData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/commits/${commitSha}`
            );
            const treeSha = commitData.tree.sha;

            const treeData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/trees/${treeSha}`
            );

            const fileEntry = treeData.tree.find(entry => entry.path === filePath);
            if (!fileEntry) {
                throw new Error(`File "${filePath}" not found in repository`);
            }

            const blobData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/blobs/${fileEntry.sha}`
            );

            const content = atob(blobData.content);

            return {
                content,
                sha: commitSha,
                blobSha: fileEntry.sha
            };
        } catch (error) {
            throw new Error(`Failed to load from GitHub: ${error.message}`);
        }
    }

    async saveToGitHub(filePath, content, commitMessage) {
        try {
            const refData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/ref/heads/${this.branch}`
            );
            const currentCommitSha = refData.object.sha;

            const commitData = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/commits/${currentCommitSha}`
            );
            const baseTreeSha = commitData.tree.sha;

            const blobResponse = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/blobs`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        content: btoa(content),
                        encoding: 'base64'
                    })
                }
            );
            const newBlobSha = blobResponse.sha;

            const treeResponse = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/trees`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        base_tree: baseTreeSha,
                        tree: [{
                            path: filePath,
                            mode: '100644',
                            type: 'blob',
                            sha: newBlobSha
                        }]
                    })
                }
            );
            const newTreeSha = treeResponse.sha;

            const newCommitResponse = await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/commits`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        message: commitMessage,
                        tree: newTreeSha,
                        parents: [currentCommitSha]
                    })
                }
            );
            const newCommitSha = newCommitResponse.sha;

            await this.request(
                `/repos/${this.repoOwner}/${this.repoName}/git/refs/heads/${this.branch}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        sha: newCommitSha,
                        force: false
                    })
                }
            );

            return {
                success: true,
                commitSha: newCommitSha
            };
        } catch (error) {
            throw new Error(`Failed to push to GitHub: ${error.message}`);
        }
    }
}

async function checkAuth() {
    try {
        const response = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'GET',
            credentials: 'include'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function getStoredFilePath() {
    return localStorage.getItem('github_file_path') || 'wordlist.dict';
}

function setStoredFilePath(filePath) {
    localStorage.setItem('github_file_path', filePath);
}

function getStoredRepoOwner() {
    return localStorage.getItem('github_repo_owner') || '';
}

function setStoredRepoOwner(owner) {
    localStorage.setItem('github_repo_owner', owner);
}

function getStoredRepoName() {
    return localStorage.getItem('github_repo_name') || '';
}

function setStoredRepoName(name) {
    localStorage.setItem('github_repo_name', name);
}

function getStoredBranch() {
    return localStorage.getItem('github_branch') || DEFAULT_BRANCH;
}

function setStoredBranch(branch) {
    localStorage.setItem('github_branch', branch);
}
