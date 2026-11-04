import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 5173);
const server = createServer(async (request, response) => {
  if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  if (request.url !== '/' && !request.url?.startsWith('/%E5%AD%97%E6%AE%B5')) {
    response.writeHead(404); response.end('Not found'); return;
  }
  try {
    const html = await readFile(new URL('../字段转换器.html', import.meta.url));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch {
    response.writeHead(500); response.end('请先运行 npm run build');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`字段工坊：http://127.0.0.1:${port}`));
