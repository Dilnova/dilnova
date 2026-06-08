const fs = require('fs');
const path = require('path');

// Load .env.local manually
const dotenvPath = path.join(__dirname, '../.env.local');
let publishableKey = '';
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*([^\n\r]+)/);
  if (match) {
    publishableKey = match[1].trim().replace(/['"]/g, '');
  }
}

console.log('Publishable Key:', publishableKey);

const getClerkDomain = (key) => {
  if (!key) return null;
  try {
    const payload = key.split('_')[2];
    if (!payload) return null;
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const domain = decoded.split('$')[0];
    return domain || null;
  } catch (e) {
    console.error('Error parsing key:', e);
    return null;
  }
};

const domain = getClerkDomain(publishableKey);
console.log('Extracted Domain:', domain);
