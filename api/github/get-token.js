import { verifySessionJWT, getInstallationAccessToken } from '../lib/jwt.js';
import { setCorsHeaders, handlePreflight, parseCookies } from '../lib/http.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  const cookies = parseCookies(req);
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const payload = verifySessionJWT(token);

  if (!payload || !payload.installationId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const installationToken = await getInstallationAccessToken(payload.installationId);

    res.status(200).json({
      token: installationToken,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Failed to get installation token:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }
}
