export default function handler(req, res) {
  // Clear the auth cookie
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');

  res.status(200).json({ success: true });
}
