import { createHmac } from 'crypto';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net');

  const { installation_id, setup_action } = req.query;

  console.log('GitHub App callback received:', { installation_id, setup_action, allParams: req.query });

  // Handle GitHub App installation callback
  // GitHub sends installation_id for both new installs and updates
  if (installation_id) {
    try {
      // Store installation ID in JWT
      const payload = {
        installationId: installation_id,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 30 days
      };

      // Simple JWT encoding (header.payload.signature)
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

      const signature = createHmac('sha256', process.env.JWT_SECRET)
        .update(`${header}.${payloadStr}`)
        .digest('base64url');

      const jwt = `${header}.${payloadStr}.${signature}`;

      // Set HTTP-only cookie
      res.setHeader('Set-Cookie', `auth_token=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);

      console.log('Cookie set successfully, redirecting to:', process.env.FRONTEND_URL);

      // Redirect to frontend
      res.redirect(302, process.env.FRONTEND_URL);
    } catch (error) {
      console.error('GitHub App installation callback error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } else {
    console.error('No installation_id in callback');
    res.status(400).json({ error: 'Invalid callback parameters', received: req.query });
  }
}
