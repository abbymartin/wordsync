import { createSessionJWT } from '../lib/jwt.js';
import { setCorsHeaders, setAuthCookie } from '../lib/http.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  const { installation_id } = req.query;

  console.log('GitHub App callback received:', { installation_id, allParams: req.query });

  if (!installation_id) {
    console.error('No installation_id in callback');
    return res.status(400).json({ error: 'Invalid callback parameters', received: req.query });
  }

  try {
    const jwt = createSessionJWT(installation_id);
    setAuthCookie(res, jwt);

    console.log('Cookie set successfully, redirecting to:', process.env.FRONTEND_URL);
    res.redirect(302, process.env.FRONTEND_URL);
  } catch (error) {
    console.error('GitHub App installation callback error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
