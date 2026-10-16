import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, resolution, duration } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  // Verification
  const timestamp = Date.now();
  const payload = `${userId}:${resolution || '1080'}:${duration || 60}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  const signature = Math.abs(hash).toString(36) + '_bf_server';
  const token = Buffer.from(JSON.stringify({ payload, signature, timestamp, userId })).toString('base64');

  return res.status(200).json({
    token,
    validUntil: new Date(timestamp + 15 * 60 * 1000).toISOString(),
    allowed: true,
  });
}
