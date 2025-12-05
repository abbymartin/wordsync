import { setCorsHeaders, handlePreflight, clearAuthCookie } from '../lib/http.js';

export default function handler(req, res) {
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  clearAuthCookie(res);
  res.status(200).json({ success: true });
}
