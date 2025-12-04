import { createHmac, createSign } from 'crypto';

function verifyJWT(token) {
  try {
    const [header, payload, signature] = token.split('.');

    const expectedSignature = createHmac('sha256', process.env.JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());

    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

function generateAppJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: process.env.GITHUB_APP_ID,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payloadStr}`);
  const signature = sign.sign(process.env.GITHUB_APP_PRIVATE_KEY, 'base64url');

  return `${header}.${payloadStr}.${signature}`;
}

async function getInstallationAccessToken(installationId) {
  const appJWT = generateAppJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appJWT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get installation access token');
  }

  const data = await response.json();
  return data.token;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get auth token from cookie
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const token = cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const payload = verifyJWT(token);

  if (!payload || !payload.installationId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Get a short-lived installation access token
    const installationToken = await getInstallationAccessToken(payload.installationId);

    res.status(200).json({
      token: installationToken,
      // Token expires in 1 hour
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Failed to get installation token:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }
}
