require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 8080);

// Lazy evaluation: only compute Airtable URL when needed (at request time)
// so the server can start even if env vars are missing.
function getAirtableBaseUrl() {
  const explicitUrl = process.env.AIRTABLE_API_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, '');

  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;
  if (!baseId || !tableId) {
    throw new Error('Missing AIRTABLE_BASE_ID or AIRTABLE_TABLE_ID env vars');
  }
  return `https://api.airtable.com/v0/${baseId}/${tableId}`;
}

function getAirtableToken() {
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) {
    throw new Error('Missing AIRTABLE_API_TOKEN env var');
  }
  return token;
}

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function buildForwardedQuery(searchParams) {
  // Allow only the query params the frontend uses.
  // Examples:
  // - pageSize, offset
  // - filterByFormula
  // - sort[0][field], sort[0][direction]
  const allowedKeys = new Set(['pageSize', 'offset', 'filterByFormula']);
  const out = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    const isSortKey = /^sort\[\d+\]\[(field|direction)\]$/.test(key);
    if (!allowedKeys.has(key) && !isSortKey) continue;
    if (value == null || value === '') continue;
    out.append(key, value);
  }

  const qs = out.toString();
  return qs ? `?${qs}` : '';
}

async function airtableFetch(url, init = {}) {
  const token = getAirtableToken(); // throws if missing

  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.error?.message || response.statusText;
    const status = body?.error?.statusCode || response.status;
    const type = body?.error?.type;
    const error = { message, status, type };
    throw Object.assign(new Error(message), { airtable: error, httpStatus: response.status });
  }

  return body;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    // API proxy: /api/questions and /api/questions/:id
    if (url.pathname === '/api/questions' || url.pathname.startsWith('/api/questions/')) {
      const AIRTABLE_BASE_URL = getAirtableBaseUrl(); // lazy, throws if missing env
      const recordId = url.pathname.startsWith('/api/questions/')
        ? url.pathname.slice('/api/questions/'.length)
        : null;

      if (req.method === 'GET') {
        const qs = buildForwardedQuery(url.searchParams);
        const targetUrl = recordId ? `${AIRTABLE_BASE_URL}/${encodeURIComponent(recordId)}${qs}` : `${AIRTABLE_BASE_URL}${qs}`;
        const data = await airtableFetch(targetUrl, { method: 'GET' });
        return sendJson(res, 200, data);
      }

      if (req.method === 'POST') {
        const body = await parseJsonBody(req);
        const data = await airtableFetch(AIRTABLE_BASE_URL, {
          method: 'POST',
          body: JSON.stringify(body ?? {}),
        });
        return sendJson(res, 200, data);
      }

      if (req.method === 'PATCH' || req.method === 'PUT') {
        if (!recordId) return sendJson(res, 400, { error: 'Missing record id in URL' });
        const body = await parseJsonBody(req);
        const targetUrl = `${AIRTABLE_BASE_URL}/${encodeURIComponent(recordId)}`;
        const data = await airtableFetch(targetUrl, {
          method: 'PATCH',
          body: JSON.stringify(body ?? {}),
        });
        return sendJson(res, 200, data);
      }

      if (req.method === 'DELETE') {
        if (!recordId) return sendJson(res, 400, { error: 'Missing record id in URL' });
        const targetUrl = `${AIRTABLE_BASE_URL}/${encodeURIComponent(recordId)}`;
        const data = await airtableFetch(targetUrl, { method: 'DELETE' });
        return sendJson(res, 200, data);
      }

      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // Static files
    const workspaceRoot = __dirname;
    const filePath = url.pathname === '/' ? path.join(workspaceRoot, 'index.html') : path.join(workspaceRoot, url.pathname);

    // Basic path traversal protection
    if (!filePath.startsWith(workspaceRoot)) {
      return sendText(res, 403, 'Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        return sendText(res, 404, 'Not Found');
      }
      res.writeHead(200, {
        'Content-Type': getContentType(filePath),
        'Content-Length': data.length,
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  } catch (err) {
    const status = err?.airtable?.status || err?.httpStatus || 500;
    return sendJson(res, status, {
      error: err?.airtable || { message: err?.message || 'Internal Server Error' },
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Umbramed server listening on http://127.0.0.1:${PORT}`);
  try {
    console.log(`Airtable base URL: ${getAirtableBaseUrl()}`);
  } catch {
    console.log('Airtable env vars not set; /api/questions will fail until configured.');
  }
});
