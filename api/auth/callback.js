import { createHmac } from 'crypto';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'Failed to get access token' });
    }

    const accessToken = tokenData.access_token;

    // Create JWT payload with GitHub token
    const payload = {
      githubToken: accessToken,
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

    // Redirect to frontend
    res.redirect(302, process.env.FRONTEND_URL);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
