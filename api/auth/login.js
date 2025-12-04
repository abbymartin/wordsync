export default function handler(req, res) {
  const appName = process.env.GITHUB_APP_NAME || 'wordsync';

  // Redirect to GitHub App installation page
  // User can select which repositories to grant access to
  const githubAppInstallUrl = `https://github.com/apps/${appName}/installations/new`;

  res.redirect(302, githubAppInstallUrl);
}
