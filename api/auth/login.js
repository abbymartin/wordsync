import crypto from 'crypto';
import { FRONTEND_URL, setCookie } from '../lib/http.js';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = `${FRONTEND_URL}/api/auth/callback`;

  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    state: state
  });

  setCookie(res, 'oauth_state', state, 600);

  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
}
