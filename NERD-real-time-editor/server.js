const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const EditorServer = require('./src/server');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});


new EditorServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
