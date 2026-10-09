'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const root = path.resolve(__dirname);
const port = 4173;
const demoUrl = `http://127.0.0.1:${port}/index-v2.html`;
const openBrowser = (url) => {
  if (process.env.GHOST_CANYON_AUTO_OPEN !== '1') return;
  execFile('cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true }, (error) => {
    if (error) process.stderr.write(`自动打开浏览器失败，请复制此地址打开：${url}\n`);
  });
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ogg': 'audio/ogg',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`).pathname);
  } catch (_) {
    response.writeHead(400).end('Bad request');
    return;
  }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const request = http.get(demoUrl, (response) => {
      const available = response.statusCode === 200;
      response.resume();
      response.on('end', () => {
        if (available) {
          process.stdout.write(`已有 Demo 服务正在运行，直接打开：${demoUrl}\n`);
          openBrowser(demoUrl);
          return;
        }
        process.stderr.write(`端口 ${port} 已被占用，但上面的服务不是 Demo。请关闭占用端口的程序后重试。\n`);
        process.exitCode = 1;
      });
    });
    request.on('error', () => {
      process.stderr.write(`端口 ${port} 已被占用，但无法连接到已有 Demo 服务。请关闭旧服务后重试。\n`);
      process.exitCode = 1;
    });
    return;
  }
  process.stderr.write(`Demo 服务启动失败：${error.message}\n`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  const url = demoUrl;
  process.stdout.write(`幽影峡谷 Demo 服务已启动：${url}\n`);
  openBrowser(url);
});
