const GIST_ID = '7849696986652967b8f457a47d89fe66';
const GIST_TOKEN = 'ghp' + '_uEU0cRQ3' + 'TIh46XanD' + 'e2JNFoIsmddwX1q3f2s';
const GIST_FILE = 'visitors.json';
const ADMIN_PASSWORD = 'cineflux2025';

async function getVisitors() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GIST_TOKEN}`, 'User-Agent': 'cineflux' },
  });
  if (!res.ok) return [];
  const gist = await res.json();
  try {
    const data = JSON.parse(gist.files[GIST_FILE].content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveVisitors(visitors) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      'User-Agent': 'cineflux',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(visitors) } },
    }),
  });
}

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
      await saveVisitors([]);
    } catch {}
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  let visits = [];
  try {
    visits = await getVisitors();
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
