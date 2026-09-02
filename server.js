'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HTML_FILE = path.join(__dirname, 'RL_Result_Checklist.html');
const DATA_FILE = path.join(__dirname, 'data.json');

const STATUSES = ['Done', 'In Progress', 'Not yet'];
const YEARS = ['2025','2026','2027','2028','2029','2030'];

function sanitize(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: String(r.id != null ? r.id : crypto.randomUUID()),
    examination: String(r.examination != null ? r.examination : ''),
    year: YEARS.indexOf(String(r.year)) > -1 ? String(r.year) : '2026',
    type: r.type === 'Recertified' ? 'Recertified' : 'New Register',
    status: STATUSES.indexOf(r.status) > -1 ? r.status : 'Not yet',
    sentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(r.sentDate != null ? r.sentDate : '')) ? String(r.sentDate) : '',
    notes: String(r.notes != null ? r.notes : ''),
    checked: !!r.checked
  };
}

function readData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [];
}

function writeData(list) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

let queue = Promise.resolve();

function mutate(fn) {
  queue = queue.then(() => {
    const result = fn(readData());
    writeData(result.data);
    return result;
  });
  return queue;
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname.replace(/\/+$/, '') || '/';

  if (p === '/api/records') {
    if (req.method === 'GET') {
      send(res, 200, { records: readData() });
      return;
    }
    if (req.method === 'PUT') {
      readBody(req).then((body) => {
        if (!Array.isArray(body) && (body === null || typeof body !== 'object' || !Array.isArray(body.records))) {
          send(res, 400, { error: 'Expected an array of records' });
          return;
        }
        const list = (Array.isArray(body) ? body : body.records)
          .map(sanitize)
          .filter(Boolean);
        mutate(() => ({ data: list })).then(() => send(res, 200, { records: list }));
      }).catch((e) => send(res, 400, { error: e.message }));
      return;
    }
    if (req.method === 'POST') {
      readBody(req).then((body) => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          send(res, 400, { error: 'Expected a record object' });
          return;
        }
        const rec = sanitize(Object.assign({}, body, { id: body.id || crypto.randomUUID() }));
        mutate((data) => {
          if (data.some((r) => r.id === rec.id)) throw Object.assign(new Error('Duplicate id ' + rec.id), { status: 409 });
          data.push(rec);
          return { data };
        }).then(() => send(res, 201, rec)).catch((e) => send(res, e.status || 400, { error: e.message }));
      }).catch((e) => send(res, 400, { error: e.message }));
      return;
    }
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const m = p.match(/^\/api\/records\/([^/]+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (req.method === 'GET') {
      const rec = readData().find((r) => r.id === id);
      if (!rec) { send(res, 404, { error: 'Not found' }); return; }
      send(res, 200, rec);
      return;
    }
    if (req.method === 'PUT') {
      readBody(req).then((body) => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          send(res, 400, { error: 'Expected a record object' });
          return;
        }
        const rec = sanitize(Object.assign({}, body, { id: id }));
        mutate((data) => {
          const i = data.findIndex((r) => r.id === id);
          if (i === -1) throw Object.assign(new Error('Not found'), { status: 404 });
          data[i] = rec;
          return { data };
        }).then(() => send(res, 200, rec)).catch((e) => send(res, e.status || 400, { error: e.message }));
      }).catch((e) => send(res, 400, { error: e.message }));
      return;
    }
    if (req.method === 'DELETE') {
      mutate((data) => {
        const i = data.findIndex((r) => r.id === id);
        if (i === -1) throw Object.assign(new Error('Not found'), { status: 404 });
        data.splice(i, 1);
        return { data };
      }).then(() => send(res, 200, { ok: true })).catch((e) => send(res, e.status || 400, { error: e.message }));
      return;
    }
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (p === '/' || p === '/index.html' || p === '/RL_Result_Checklist.html') {
    try {
      const html = fs.readFileSync(HTML_FILE);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('Checklist server running at http://localhost:' + PORT);
});