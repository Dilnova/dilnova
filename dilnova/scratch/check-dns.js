const dns = require('dns');

function lookup(domain) {
  dns.lookup(domain, (err, address, family) => {
    if (err) {
      console.error(`Lookup for ${domain} failed: ${err.message}`);
    } else {
      console.log(`Lookup for ${domain}: address=${address}, family=IPv${family}`);
    }
  });
}

lookup('www.dilstar.pp.ua');
lookup('clerk.dilstar.pp.ua');
lookup('google.com');
