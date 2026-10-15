import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const trendsPath = path.resolve(process.cwd(), 'public', 'trends.json');

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(trendsPath)) {
        const content = fs.readFileSync(trendsPath, 'utf-8');
        return res.status(200).json(JSON.parse(content));
      } else {
        return res.status(404).json({ error: 'trends.json not found' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { password, data } = req.body || {};
    const adminPass = process.env.ADMIN_PASSWORD || 'bounceforge2026';

    if (password !== adminPass) {
      return res.status(401).json({ error: 'Unauthorized: invalid admin password' });
    }

    if (!data) {
      return res.status(400).json({ error: 'Missing trends data payload' });
    }

    try {
      const updatedData = {
        ...data,
        updated: new Date().toISOString(),
      };
      fs.writeFileSync(trendsPath, JSON.stringify(updatedData, null, 2), 'utf-8');
      return res.status(200).json({ success: true, updated: updatedData.updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
