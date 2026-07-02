import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

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

  let saved = false;
  let errorMsg = null;
  try {
    await kv.lpush('visits', entry);
    await kv.ltrim('visits', 0, 9999);
    saved = true;
  } catch (e) {
    errorMsg = e.message || String(e);
  }

  const result = JSON.stringify({ ok: true, saved, ip, error: errorMsg });

  const callback = new URL(req.url).searchParams.get('callback');
  if (callback) {
    const body = `${callback}(${result})`;
    return new Response(body, {
      headers: { 'content-type': 'application/javascript', 'cache-control': 'no-store' },
    });
  }

  return new Response(result, {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
