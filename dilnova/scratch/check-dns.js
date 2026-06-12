const https = require('https');

const DOMAIN = 'dilstar.pp.ua';

function checkDns() {
  console.log(`Checking DNS TXT records for ${DOMAIN} via Google DNS-over-HTTPS...\n`);
  const url = `https://dns.google/resolve?name=${DOMAIN}&type=TXT`;
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.Answer && result.Answer.length > 0) {
          console.log('Found TXT records:');
          result.Answer.forEach((record, index) => {
            // Remove wrapping quotes if present
            const cleanData = record.data.replace(/^"|"$/g, '');
            console.log(`${index + 1}. ${cleanData}`);
          });
        } else {
          console.log('No TXT records found.');
        }
      } catch (err) {
        console.error('Error parsing DNS response:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('Network error querying DNS-over-HTTPS:', err.message);
  });
}

checkDns();
