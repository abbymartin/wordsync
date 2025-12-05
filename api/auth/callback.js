import { createSessionJWT } from '../lib/jwt.js';
import { setCorsHeaders, setAuthCookie, parseCookies } from '../lib/http.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  const { code, state, installation_id } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net';

  console.log('Auth callback received:', { code: !!code, state, installation_id });

  // Handle GitHub App installation callback (first-time install)
  if (installation_id) {
    try {
      const jwt = createSessionJWT(installation_id);
      setAuthCookie(res, jwt);
      console.log('Installation callback: cookie set, redirecting');
      return res.redirect(302, frontendUrl);
    } catch (error) {
      console.error('Installation callback error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handle OAuth callback (returning users)
  if (code) {
    try {
      // Verify state to prevent CSRF
      const cookies = parseCookies(req);
      if (cookies.oauth_state !== state) {
        console.error('State mismatch:', { expected: cookies.oauth_state, received: state });
        return res.redirect(302, `${frontendUrl}?error=invalid_state`);
      }

      // Clear the state cookie
      res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('OAuth token error:', tokenData);
        return res.redirect(302, `${frontendUrl}?error=oauth_failed`);
      }

      // Get user's installations
      const installationsResponse = await fetch('https://api.github.com/user/installations', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      const installationsData = await installationsResponse.json();

      if (!installationsData.installations || installationsData.installations.length === 0) {
        // User doesn't have the app installed - redirect to install
        const appName = process.env.GITHUB_APP_NAME || 'wordsync';
        return res.redirect(302, `https://github.com/apps/${appName}/installations/new`);
      }

      // Use the first installation (or you could let user choose if multiple)
      const installationId = installationsData.installations[0].id;

      const jwt = createSessionJWT(installationId);
      setAuthCookie(res, jwt);

      console.log('OAuth callback: cookie set, redirecting');
      return res.redirect(302, frontendUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(302, `${frontendUrl}?error=auth_failed`);
    }
  }

  console.error('Invalid callback - no code or installation_id');
  return res.redirect(302, `${frontendUrl}?error=invalid_callback`);
}
