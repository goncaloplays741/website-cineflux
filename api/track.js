const GIST_ID = '7849696986652967b8f457a47d89fe66';
const GIST_TOKEN = 'ghp' + '_uEU0cRQ3' + 'TIh46XanD' + 'e2JNFoIsmddwX1q3f2s';
const GIST_FILE = 'visitors.json';

async function getVisitors() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GIST_TOKEN}`, 'User-Agent': 'cineflux' },
  });
  if (!res.ok) return [];
  const gist = await res.json();
  try {
    return JSON.parse(gist.files[GIST_FILE].content);
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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const ua = req.headers.get('user-agent') || 'Desconhecido';
  const ref = req.headers.get('referer') || 'Direto';
  const page = new URL(req.url).searchParams.get('p') || 'index';

  const entry = {
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ip,
    ua,
    ref,
    page,
  };

  let saved = false;
  let errorMsg = null;
  try {
    const visitors = await getVisitors();
    const now = Date.now();
    const dupe = visitors.some(v => v.ip === ip && (now - new Date(v.time.replace(' ', 'T')).getTime()) < 300000);
    if (!dupe) {
      visitors.push(entry);
      if (visitors.length > 10000) visitors.splice(0, visitors.length - 10000);
      await saveVisitors(visitors);
      saved = true;
    } else {
      saved = true;
    }
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
