// Runs the counter on this computer, or on any server with Node and a Postgres
// database. Reads its settings from .env in this folder (see .env.example).
//
//   node local.mjs
//
// This is also the way to host it somewhere other than Neon.

import http from 'node:http';
import fs from 'node:fs';
import { Pool } from 'pg';
import { createHandler } from './handler.mjs';

const envFile = new URL('./.env', import.meta.url);
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
pool.on('error', () => {});
const handler = createHandler({ query: (sql, params) => pool.query(sql, params), env: process.env });
const port = Number(process.env.PORT) || 5185;

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const response = await handler(new Request('http://' + req.headers.host + req.url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? Buffer.concat(chunks) : undefined
  }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log('Usage counter on http://localhost:' + port));
