const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const HTTPS_PORT = 3443;
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 8000;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.pem')),
};

const proxy = https.createServer(options, (req, res) => {
  // Route /ws/* and /api/* to backend, everything else to frontend
  const isBackendRoute = req.url.startsWith('/ws/') || req.url.startsWith('/api/transcription/');
  const targetPort = isBackendRoute ? BACKEND_PORT : FRONTEND_PORT;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`,
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
  // Route /ws/* to backend, everything else to frontend
  const isBackendRoute = req.url.startsWith('/ws/');
  const targetPort = isBackendRoute ? BACKEND_PORT : FRONTEND_PORT;

  console.log(`WebSocket upgrade: ${req.url} -> port ${targetPort}`);

  const proxySocket = net.connect(targetPort, '127.0.0.1', () => {
    // Send the original HTTP upgrade request
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');

    proxySocket.write(
      `${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`
    );

    // If there's buffered data (head), send it
    if (head && head.length) {
      proxySocket.write(head);
    }

    // Pipe data between client and target
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (err) => {
    console.error('WebSocket proxy error:', err.message);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error('Client socket error:', err.message);
    proxySocket.destroy();
  });
});

proxy.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS proxy running on https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`  Frontend (HTTP):  http://127.0.0.1:${FRONTEND_PORT}`);
  console.log(`  Backend (HTTP):   http://127.0.0.1:${BACKEND_PORT}`);
  console.log(`  WebSocket /ws/*:  -> backend:${BACKEND_PORT}`);
});
