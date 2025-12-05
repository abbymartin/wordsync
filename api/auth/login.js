export default function handler(req, res) {
  const appName = process.env.GITHUB_APP_NAME || 'wordsync';
  const frontendUrl = process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net';
  const callbackUrl = `${frontendUrl}/api/auth/callback`;

  // new users: should show app installation page
  // existing users: should show repository selection and redirects back
  const params = new URLSearchParams({
    redirect_uri: callbackUrl
  });

  const githubAppInstallUrl = `https://github.com/apps/${appName}/installations/select_target?${params}`;

  res.redirect(302, githubAppInstallUrl);
}
