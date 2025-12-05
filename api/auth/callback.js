import { createSessionJWT } from '../lib/jwt.js';
import { FRONTEND_URL, parseCookies, setCookie, clearCookie } from '../lib/http.js';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export default async function handler(req, res) {
  const { code, state, installation_id } = req.query;

  // GitHub App installation callback (first-time install)
  if (installation_id) {
    const jwt = createSessionJWT(installation_id);
    setCookie(res, 'auth_token', jwt, THIRTY_DAYS);
    return res.redirect(302, FRONTEND_URL);
  }

  // OAuth callback (returning users)
  if (code) {
    const cookies = parseCookies(req);
    if (cookies.oauth_state !== state) {
      return res.redirect(302, `${FRONTEND_URL}?error=invalid_state`);
    }

    clearCookie(res, 'oauth_state');

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
      return res.redirect(302, `${FRONTEND_URL}?error=oauth_failed`);
    }

    // Get user's installations
    const installationsResponse = await fetch('https://api.github.com/user/installations', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    const installationsData = await installationsResponse.json();

    if (!installationsData.installations?.length) {
      const appName = process.env.GITHUB_APP_NAME || 'wordsync';
      return res.redirect(302, `https://github.com/apps/${appName}/installations/new`);
    }

    const jwt = createSessionJWT(installationsData.installations[0].id);
    setCookie(res, 'auth_token', jwt, THIRTY_DAYS);
    return res.redirect(302, FRONTEND_URL);
  }

  return res.redirect(302, `${FRONTEND_URL}?error=invalid_callback`);
}
