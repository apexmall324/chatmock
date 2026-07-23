const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rootDir = __dirname;
const logsFile = path.join(rootDir, 'admin', 'logs.json');
const chatStateFile = path.join(rootDir, 'admin', 'chat-state.json');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function ensureLogsFile() {
  if (!fs.existsSync(logsFile)) {
    fs.writeFileSync(logsFile, '[]', 'utf8');
  }
}

function ensureChatStateFile() {
  if (!fs.existsSync(chatStateFile)) {
    fs.writeFileSync(chatStateFile, 'null', 'utf8');
  }
}

function readLogs() {
  ensureLogsFile();
  try {
    return JSON.parse(fs.readFileSync(logsFile, 'utf8'));
  } catch {
    return [];
  }
}

function writeLogs(data) {
  fs.writeFileSync(logsFile, JSON.stringify(data, null, 2), 'utf8');
}

function readChatState() {
  ensureChatStateFile();
  try {
    return JSON.parse(fs.readFileSync(chatStateFile, 'utf8'));
  } catch {
    return null;
  }
}

function writeChatState(data) {
  fs.writeFileSync(chatStateFile, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

async function getLocation(ip) {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function getFilePath(requestPath) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(rootDir, normalizedPath));

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

function serveStaticFile(filePath, res) {
  fs.stat(filePath, (error, stats) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        serveStaticFile(indexFile, res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (pathname === '/api/log' && req.method === 'POST') {
    try {
      const raw = await readRequestBody(req);
      const payload = JSON.parse(raw || '{}');
      const ip = getClientIp(req);
      const location = await getLocation(ip);

      const entry = {
        timestamp: new Date().toISOString(),
        page: payload.page || '/',
        event: payload.event || 'unknown',
        element: payload.element || 'unknown',
        details: payload.details || {},
        ip,
        location: location || null
      };

      const logs = readLogs();
      logs.push(entry);
      writeLogs(logs.slice(-500));

      sendJson(res, 200, { ok: true, entry });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === '/api/chat' && req.method === 'GET') {
    sendJson(res, 200, readChatState());
    return;
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const raw = await readRequestBody(req);
      const payload = JSON.parse(raw || 'null');
      writeChatState(payload);
      sendJson(res, 200, { ok: true, data: payload });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === '/api/chat' && req.method === 'DELETE') {
    writeChatState(null);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/logs' && req.method === 'GET') {
    sendJson(res, 200, readLogs());
    return;
  }

  if (pathname === '/api/logs' && req.method === 'DELETE') {
    writeLogs([]);
    sendJson(res, 200, { ok: true });
    return;
  }

  const filePath = getFilePath(pathname);

  if (filePath && fs.existsSync(filePath)) {
    serveStaticFile(filePath, res);
    return;
  }

  if (filePath && !path.extname(filePath)) {
    const indexFile = path.join(filePath, 'index.html');
    if (fs.existsSync(indexFile)) {
      serveStaticFile(indexFile, res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(8000, () => {
  console.log('Monitoring server running on http://127.0.0.1:8000');
});
