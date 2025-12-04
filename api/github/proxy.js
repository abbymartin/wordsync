import { createHmac } from 'crypto';

function verifyJWT(token) {
  try {
    const [header, payload, signature] = token.split('.');

    // Verify signature
    const expectedSignature = createHmac('sha256', process.env.JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // Get token from cookie
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const token = cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Verify JWT and extract GitHub token
  const payload = verifyJWT(token);

  if (!payload || !payload.githubToken) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const githubToken = payload.githubToken;

  // Proxy the request to GitHub API
  const { path, method = 'GET', body } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: 'GitHub API path required' });
  }

  try {
    const githubUrl = `https://api.github.com${path}`;

    const options = {
      method,
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(githubUrl, options);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('GitHub API proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request to GitHub' });
  }
}
