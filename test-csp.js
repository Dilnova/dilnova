const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Security-Policy': 'upgrade-insecure-requests;'
  });
  res.end('<h1>Hello</h1>');
});
server.listen(3002, () => console.log('Listening on 3002'));
