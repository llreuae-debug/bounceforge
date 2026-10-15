import { z } from 'zod';

// In-memory rate limiting map: ip -> timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

// Request schemas
const GenerateHooksSchema = z.object({
  action: z.literal('generate_hooks'),
  modeName: z.string(),
  category: z.string(),
  endingType: z.string().optional().default('escape'),
  preset: z.string().optional().default('viral'),
  duration: z.number().optional().default(60),
  contestants: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional().default(['curiosity']),
  language: z.string().optional().default('en'),
  emoji: z.boolean().optional().default(true),
  casing: z.enum(['as_written', 'lowercase', 'uppercase']).optional().default('as_written'),
});

const GenerateSeoSchema = z.object({
  action: z.literal('generate_seo'),
  modeName: z.string(),
  category: z.string(),
  hookText: z.string(),
  duration: z.number().default(60),
  seed: z.number().default(1337),
  resolution: z.string().default('1080'),
});

const WhatNextSchema = z.object({
  action: z.literal('what_next'),
  currentModeId: z.string(),
  currentSettings: z.record(z.any()).optional(),
  recentHistory: z.array(z.record(z.any())).optional(),
  performanceInsights: z.record(z.any()).optional(),
});

const GenerateLabelsSchema = z.object({
  action: z.literal('generate_labels'),
  type: z.enum(['counter', 'end_card_cta', 'contestant_names']),
  modeName: z.string(),
  category: z.string(),
});

const RequestSchema = z.discriminatedUnion('action', [
  GenerateHooksSchema,
  GenerateSeoSchema,
  WhatNextSchema,
  GenerateLabelsSchema,
]);

export default async function handler(req: any, res: any) {
  // CORS Origin validation
  const origin = req.headers?.origin || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'https://bounceforge.vercel.app',
  ];

  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    !origin ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost');

  if (!isAllowedOrigin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
    .toString()
    .split(',')[0]
    .trim();

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded (max 30 requests per hour). Falling back to offline engine.',
      isRateLimited: true,
    });
  }

  // Parse and validate input
  const parseResult = RequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() });
  }

  const data = parseResult.data;
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';

  // If no API key configured on server, let client know immediately to use offline engine
  if (!apiKey) {
    return res.status(200).json({
      isAi: false,
      reason: 'No AI_API_KEY configured on server; using offline fallback template engine.',
    });
  }

  try {
    const aiResult = await callGeminiWithRetry(apiKey, model, data);
    return res.status(200).json({
      isAi: true,
      model,
      data: aiResult,
    });
  } catch (err: any) {
    console.error('Gemini API execution error:', err.message);
    return res.status(200).json({
      isAi: false,
      reason: `Gemini execution failed: ${err.message}`,
    });
  }
}

/**
 * Calls Gemini API with 1 retry and strict JSON schema
 */
async function callGeminiWithRetry(apiKey: string, model: string, payload: any): Promise<any> {
  const systemPrompt = `You are a viral short-form video creative technologist (TikTok, YouTube Shorts, Reels) and SEO master for BounceForge, a high-octane 2D ball physics simulator.
RULES:
1. Return strictly valid raw JSON only. Do NOT wrap in markdown \`\`\`json or backticks.
2. Front-load the most intriguing keywords (e.g., "can it escape", "wait for the end", "which color wins").
3. Max 40 characters for hook lines; readable in <1.5s; 100% original.
4. ZERO song titles, celebrity names, brand names, or copyrighted phrases.
5. NO misleading promises (if ball escapes, never say it fails).`;

  let userPrompt = '';

  if (payload.action === 'generate_hooks') {
    userPrompt = `Generate exactly 6 distinct, high-CTR hook lines for:
Mode: ${payload.modeName} (${payload.category})
Ending: ${payload.endingType}
Duration: ${payload.duration}s
Preset: ${payload.preset}
Contestants: ${payload.contestants ? payload.contestants.join(', ') : 'Single ball'}
Styles: ${payload.styles.join(', ')}
Language: ${payload.language}
Include Emoji: ${payload.emoji}
Casing: ${payload.casing}

JSON structure:
{
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5", "hook6"]
}`;
  } else if (payload.action === 'generate_seo') {
    userPrompt = `Generate a platform-optimized SEO pack for a short video:
Mode: ${payload.modeName} (${payload.category})
Hook: "${payload.hookText}"
Duration: ${payload.duration}s
Seed: ${payload.seed}

JSON structure:
{
  "tiktok": {
    "caption": "Short 1-2 line caption with keyword in first 5 words + question",
    "hashtags": ["#satisfying", "#asmr", "#ballsimulation", "#physics", "#viral"],
    "onscreenCheck": { "passes": true, "detectedKeyword": "escape", "suggestedTweak": "" }
  },
  "reels": {
    "caption": "Hook line + 1 line context + engagement question",
    "hashtags": ["#satisfying", "#asmr", "#physics", "#oddlysatisfying"],
    "altText": "A clean descriptive accessibility sentence describing the simulation.",
    "coverText": "2-3 word dramatic cover hook"
  },
  "shorts": {
    "title": "Title under 70 chars with main keyword first and curiosity at end",
    "description": "2-3 lines with relevant keywords followed by 3 hashtags including #shorts",
    "tags": "comma,separated,tags,under,500,chars"
  },
  "common": {
    "fileName": "seo-friendly-name-without-spaces.mp4",
    "pinnedComment": "Question to drive comments",
    "bestPostingWindow": "e.g. 12:00 PM - 2:00 PM & 7:00 PM - 9:30 PM (peak audience engagement)"
  }
}`;
  } else if (payload.action === 'what_next') {
    userPrompt = `Suggest 6 strategic next videos / creator actions based on current mode "${payload.currentModeId}":
JSON structure:
{
  "suggestions": [
    {
      "id": "s1",
      "type": "next_video",
      "title": "Try Pick Ur Color Next",
      "reason": "Battle modes drive 2.4x more comments than solo escapes.",
      "modeId": "pick_ur_color",
      "preset": "viral",
      "themeId": "neon_night",
      "hookText": "pick a color before it starts"
    },
    {
      "id": "s2",
      "type": "part_2",
      "title": "Make Part 2 with Sequel Seed",
      "reason": "Serial storytelling doubles viewer retention on your profile.",
      "modeId": "${payload.currentModeId}",
      "partNumber": 2,
      "hookText": "part 2: can it beat the record??"
    },
    {
      "id": "s3",
      "type": "ab_test",
      "title": "A/B Test Curiosity vs Challenge Hook",
      "reason": "Challenge hooks ('bet you can't guess') increase initial 3s hold.",
      "modeId": "${payload.currentModeId}",
      "hookText": "this one took 840 attempts..."
    },
    {
      "id": "s4",
      "type": "remix",
      "title": "Double Ball Turbo Speed Remix",
      "reason": "High-octane physics remixes perform well on Instagram Reels.",
      "modeId": "chaos_to_order",
      "hookText": "wait for the perfect snap"
    },
    {
      "id": "s5",
      "type": "batch_idea",
      "title": "Batch 5 Color Battle Variations",
      "reason": "Stacking variations schedules your entire week in one export.",
      "modeId": "name_battle",
      "hookText": "who wins the name duel??"
    },
    {
      "id": "s6",
      "type": "series_plan",
      "title": "7-Day Physics Mastery Series",
      "reason": "A 7-day scheduled theme establishes an algorithm content cluster.",
      "modeId": "hundred_rings",
      "hookText": "can it clear all 100 rings??"
    }
  ]
}`;
  } else if (payload.action === 'generate_labels') {
    userPrompt = `Generate 6 original options for ${payload.type} in mode "${payload.modeName}":
JSON structure:
{
  "options": ["option1", "option2", "option3", "option4", "option5", "option6"]
}`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 1200,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
      }

      const resJson: any = await response.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
      return parsed;
    } catch (error: any) {
      if (attempts >= 2) throw error;
      // Sleep 300ms before retry
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
