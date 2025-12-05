import crypto from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const frontendUrl = process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net';
  const callbackUrl = `${frontendUrl}/api/auth/callback`;

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Use OAuth flow - works for both new and returning users
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    state: state
  });

  // Set state in cookie for verification in callback
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);

  const githubOAuthUrl = `https://github.com/login/oauth/authorize?${params}`;

  res.redirect(302, githubOAuthUrl);
}
