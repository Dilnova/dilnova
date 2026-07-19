const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: 'http://does-not-exist-abcxyz123.com' });
  res.end();
});
server.listen(3001, () => console.log('Listening on 3001'));
