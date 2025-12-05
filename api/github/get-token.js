import { verifySessionJWT, getInstallationAccessToken } from '../lib/jwt.js';
import { setCorsHeaders, handlePreflight, parseCookies } from '../lib/http.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  const cookies = parseCookies(req);

  if (!cookies.auth_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const payload = verifySessionJWT(cookies.auth_token);

  if (!payload?.installationId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const token = await getInstallationAccessToken(payload.installationId);
    res.status(200).json({ token, expiresIn: 3600 });
  } catch (error) {
    console.error('Failed to get installation token:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }
}
