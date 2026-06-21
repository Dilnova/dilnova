const https = require('https');

function checkClerk(url) {
  console.log(`Fetching Clerk endpoint: ${url}`);
  const req = https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('BODY snippet:', data.substring(0, 500));
    });
  });

  req.on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });
}

checkClerk('https://clerk.dilstar.pp.ua/v1/client?_clerk_js_version=6.12.1');
