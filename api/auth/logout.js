import { setCorsHeaders, handlePreflight, clearCookie } from '../lib/http.js';

export default function handler(req, res) {
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  clearCookie(res, 'auth_token');
  res.status(200).json({ success: true });
}
