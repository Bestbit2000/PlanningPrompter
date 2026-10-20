// The server the back tests run against (PO-92). It serves the tool from the repository
// as it is on disk, with two differences that only exist here:
//   - stats.js sends its counts to /__count on this server instead of the live counter,
//     so a test run is never counted and the tests can see what would have been sent;
//   - /__host is a copy of the consumerduty.org page that shows the tool in a frame (PO-91),
//     with the snippet from docs/EMBEDDING.md. ?snippet=0 leaves the snippet out,
//     ?keep100vh=1 keeps the site's old "height: 100vh !important" rule.
//
// node tests/server.mjs [port]     (default 5199)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 5199);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const snippet = () => {
  const md = fs.readFileSync(path.join(root, 'docs', 'EMBEDDING.md'), 'utf8');
  return md.match(/```html\r?\n([\s\S]*?)```/)[1];
};

// Laid out like the consumerduty.org page on 20 October 2026: its header and banner, the
// Joomla wrapper frame with the site's custom CSS and its once-on-load height script, a footer.
const hostPage = (url) => {
  const withSnippet = url.searchParams.get('snippet') !== '0';
  const keep100vh = !withSnippet || url.searchParams.get('keep100vh') === '1';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock host</title>
<style>
body { margin: 0; font-family: sans-serif; }
.main-header { height: 135px; background: #fff; border-bottom: 1px solid #ddd; padding: 20px; }
.banner { height: 97px; background: #4a3a6b; color: #fff; padding: 20px; }
.container { max-width: 1170px; margin: 0 auto; padding: 0 15px; }
footer { height: 300px; background: #2b2340; color: #fff; padding: 20px; }
.iframepageCSS { margin-top: -25px; margin-bottom: -40px; }
</style>
<style>
.iframepageCSS {
  border-style: none;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
  ${keep100vh ? 'height: 100vh !important;' : ''}
}
</style>
<script>
function iFrameHeight(t) { var d = t.contentDocument || t.contentWindow.document; t.style.height = (parseInt(d.body.scrollHeight, 10) + 60) + 'px'; }
</script>
</head><body>
<header class="main-header">Mock Consumer Duty Alliance header</header>
<div class="banner">Retirement income prompt generator</div>
<div class="container"><div class="com-wrapper contentpane">
<iframe onload="iFrameHeight(this)" id="blockrandom" name="iframe" src="/" width="100%" height="500" title="Retirement income prompt generator" class="com-wrapper__iframe wrapper iframepageCSS"></iframe>
</div></div>
<footer>Mock footer</footer>
${withSnippet ? snippet() : ''}
</body></html>`;
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__host') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    return res.end(hostPage(url));
  }
  // The tests catch counts in the browser; this only answers anything that gets through
  if (url.pathname === '/__count') { res.writeHead(204); return res.end(); }

  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    if (p === '/stats.js') {
      data = Buffer.from(String(data).replace(/window\.STATS_ENDPOINT = '[^']*';/, "window.STATS_ENDPOINT = '/__count';"));
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('Back-test server on http://localhost:' + port));
