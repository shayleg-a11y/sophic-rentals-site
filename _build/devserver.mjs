// Local dev server: static files + real API handlers (needs env vars) or mock API (MOCK=1).
// node _build/devserver.mjs  -> http://localhost:8787
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const MOCK = process.env.MOCK === '1';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml' };
const mockDB = {};
async function mockApi(name, req, res, body) {
  const json = (c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (name === 'fleet') return json(200, { models: { 'Model 3': { available: 4, total: 10, weekly_rate: 500 }, 'Model Y': { available: 0, total: 2, weekly_rate: 600 }, 'Model X': { available: 0, total: 1, weekly_rate: 700 } } });
  if (name === 'apply') { const b = JSON.parse(body || '{}'); if (b.website) return json(200, { ok: true, id: 'hp', reference_number: 'HP' }); if (b.stage === 'reserve') { if (!mockDB[b.ref]) return json(404, { error: 'not_found' }); Object.assign(mockDB[b.ref], b); return json(200, { ok: true, id: mockDB[b.ref].id, reference_number: b.ref }); } for (const k of ['first_name','last_name','email','phone']) if (!b[k]) return json(400, { error: 'Missing required field: ' + k }); const ref = 'T' + Math.random().toString(36).slice(2, 8).toUpperCase(); mockDB[ref] = Object.assign({ id: 'id-' + ref }, b); return json(200, { ok: true, id: 'id-' + ref, reference_number: ref }); }
  if (name === 'checkout') { const b = JSON.parse(body || '{}'); return json(200, { url: '/thanks?ref=' + (b.reference || 'X') + '&mock=1', mode: 'mock' }); }
  if (name === 'sign-upload') return json(200, { path: 'x/y/z.jpg', uploadUrl: '/__upload' });
  if (name === 'finalize') return json(200, { ok: true });
  return json(404, { error: 'no_mock' });
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); let p = u.pathname;
  let body = ''; for await (const c of req) body += c;
  if (p === '/__upload') { res.writeHead(200); return res.end('{}'); }
  if (p.startsWith('/api/')) {
    const name = p.slice(5).replace(/\.js$/, '');
    if (MOCK) return mockApi(name, req, res, body);
    try {
      const mod = await import(path.join(ROOT, 'api', name + '.js'));
      req.query = Object.fromEntries(u.searchParams); req.body = body;
      const r = { _h: {}, setHeader(k, v) { this._h[k] = v; }, status(c) { this._c = c; return this; }, json(o) { res.writeHead(this._c || 200, Object.assign({ 'content-type': 'application/json' }, this._h)); res.end(JSON.stringify(o)); }, writeHead: (c, h) => res.writeHead(c, h), end: (x) => res.end(x), get headersSent() { return res.headersSent; } };
      return mod.default(req, r);
    } catch (e) { res.writeHead(500); return res.end(String(e)); }
  }
  if (p === '/') p = '/index.html'; else if (!path.extname(p)) p += '.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(ROOT, '404.html'))); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
}).listen(process.env.PORT || 8787, () => console.log('dev server on', process.env.PORT || 8787, MOCK ? '(mock api)' : '(real api)'));
