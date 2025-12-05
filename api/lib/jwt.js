import { createHmac, createSign } from 'crypto';

export function createSessionJWT(installationId) {
  const payload = {
    installationId,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 30 days
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = createHmac('sha256', process.env.JWT_SECRET)
    .update(`${header}.${payloadStr}`)
    .digest('base64url');

  return `${header}.${payloadStr}.${signature}`;
}

export function verifySessionJWT(token) {
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

export function generateGitHubAppJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds in the past to account for clock drift
    exp: now + 600, // Expires in 10 minutes
    iss: process.env.GITHUB_APP_ID,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payloadStr}`);
  const signature = sign.sign(process.env.GITHUB_APP_PRIVATE_KEY, 'base64url');

  return `${header}.${payloadStr}.${signature}`;
}

export async function getInstallationAccessToken(installationId) {
  const appJWT = generateGitHubAppJWT();

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
