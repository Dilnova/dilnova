const https = require('https');

function checkRedirect(url) {
  console.log(`Checking URL: ${url}`);
  https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('HEADERS:');
    console.log(JSON.stringify(res.headers, null, 2));
    
    if (res.headers.location) {
      console.log(`Redirecting to: ${res.headers.location}`);
      if (res.statusCode >= 300 && res.statusCode < 400) {
        checkRedirect(res.headers.location);
      }
    }
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });
}

checkRedirect('https://www.dilstar.pp.ua');
