import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = 'cineflux2025';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (body.password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Senha incorreta!' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (body.action === 'clear') {
    try {
      await kv.del('visits');
    } catch {}
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  let visits = [];
  try {
    const raw = await kv.lrange('visits', 0, 999);
    visits = raw.map(r => {
      try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  const uniqueIps = new Set();

  for (const v of visits) {
    if (v.time && v.time.startsWith(today)) todayCount++;
    if (v.ip) uniqueIps.add(v.ip);
  }

  return new Response(JSON.stringify({
    ok: true,
    stats: { total: visits.length, today: todayCount, unique: uniqueIps.size },
    visits,
  }), {
    headers: { 'content-type': 'application/json' },
  });
}
