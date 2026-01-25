const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HTTPS_PORT = 3443;
const HTTP_TARGET = 'http://127.0.0.1:3000';

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.pem')),
};

const proxy = https.createServer(options, (req, res) => {
  const targetUrl = new URL(req.url, HTTP_TARGET);

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:3000',
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

// Handle WebSocket upgrades
proxy.on('upgrade', (req, socket, head) => {
  const target = new URL('ws://127.0.0.1:3000' + req.url);

  const proxySocket = require('net').connect(3000, '127.0.0.1', () => {
    proxySocket.write(
      `${req.method} ${req.url} HTTP/1.1\r\n` +
      Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (err) => {
    console.error('WebSocket proxy error:', err.message);
    socket.destroy();
  });
});

proxy.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS proxy running on https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`Proxying to ${HTTP_TARGET}`);
});
