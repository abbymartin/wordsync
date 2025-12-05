export const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wordsync.abbymartin.net';

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export function parseCookies(req) {
  return req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};
}

export function setCookie(res, name, value, maxAge) {
  res.setHeader('Set-Cookie', `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

export function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
