import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const ua = req.headers.get('user-agent') || 'Desconhecido';
  const ref = req.headers.get('referer') || 'Direto';
  const page = new URL(req.url).searchParams.get('p') || 'index';

  const entry = JSON.stringify({
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ip,
    ua,
    ref,
    page,
  });

  try {
    await redis.lpush('visits', entry);
    await redis.ltrim('visits', 0, 9999);
  } catch (e) {
    // silently fail
  }

  const callback = new URL(req.url).searchParams.get('callback');
  if (callback) {
    const body = `${callback}({"ok":true})`;
    return new Response(body, {
      headers: {
        'content-type': 'application/javascript',
        'cache-control': 'no-store',
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
