const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HTTPS_PORT = 3443;
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 8000;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.pem')),
};

const proxy = https.createServer(options, (req, res) => {
  // Route /ws/* and backend API to backend, everything else to frontend
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

// Handle WebSocket upgrades properly
proxy.on('upgrade', (req, socket, head) => {
  // Route /ws/* to backend, everything else to frontend
  const isBackendRoute = req.url.startsWith('/ws/');
  const targetPort = isBackendRoute ? BACKEND_PORT : FRONTEND_PORT;

  console.log(`WebSocket upgrade: ${req.url} -> port ${targetPort}`);

  // Create HTTP request to upgrade
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: 'GET',
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
    },
  });

  proxyReq.on('error', (err) => {
    console.error('WebSocket proxy error:', err.message);
    socket.destroy();
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    console.log(`WebSocket upgraded successfully: ${req.url}`);

    // Send the 101 response to the client
    let response = 'HTTP/1.1 101 Switching Protocols\r\n';
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      response += `${key}: ${value}\r\n`;
    }
    response += '\r\n';
    socket.write(response);

    // If there's buffered data, send it
    if (proxyHead && proxyHead.length) {
      socket.write(proxyHead);
    }
    if (head && head.length) {
      proxySocket.write(head);
    }

    // Pipe data bidirectionally
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);

    proxySocket.on('error', (err) => {
      console.error('Proxy socket error:', err.message);
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.error('Client socket error:', err.message);
      proxySocket.destroy();
    });
  });

  proxyReq.end();
});

proxy.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS proxy running on https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`  Frontend (HTTP):  http://127.0.0.1:${FRONTEND_PORT}`);
  console.log(`  Backend (HTTP):   http://127.0.0.1:${BACKEND_PORT}`);
  console.log(`  WebSocket /ws/*:  -> backend:${BACKEND_PORT}`);
});
