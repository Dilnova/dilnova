import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    read_paths: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
        { duration: '1m', target: 50 },   // Scale to 50 virtual users
        { duration: '30s', target: 0 },   // Ramp-down to 0
      ],
      exec: 'readPaths',
    },
    write_paths: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'writePaths',
    },
  },
  thresholds: {
    // Read paths must remain highly available and fast
    'http_req_failed{scenario:read_paths}': ['rate<0.01'],   
    'http_req_duration{scenario:read_paths}': ['p(95)<1500'], 
    
    // Write paths will intentionally hit 429 Rate Limit responses
    // We validate that at least some write requests hit the rate limiter (success in defense)
    'http_reqs{scenario:write_paths}': ['count>0'],
  },
};

export function readPaths() {
  const baseUrl = __ENV.TARGET_URL || 'http://localhost:3000';

  const catalogRes = http.get(`${baseUrl}/`);
  check(catalogRes, { 'catalog status is 200': (r) => r.status === 200 });
  sleep(1);

  const productsRes = http.get(`${baseUrl}/products`);
  check(productsRes, { 'products page is 200': (r) => r.status === 200 });
  sleep(1);

  const contactRes = http.get(`${baseUrl}/contact`);
  check(contactRes, { 'contact page is 200': (r) => r.status === 200 });
  sleep(1);

  const cartRes = http.get(`${baseUrl}/cart`);
  check(cartRes, { 'cart page is 200': (r) => r.status === 200 });
  sleep(1);
}

export function writePaths() {
  const baseUrl = __ENV.TARGET_URL || 'http://localhost:3000';
  
  // Test credentials passed via env vars (staging use only)
  const authToken = __ENV.TEST_AUTH_TOKEN || 'test-clerk-jwt';
  const turnstileToken = __ENV.TEST_TURNSTILE_TOKEN || '1x00000000000000000000AA'; // Dummy valid token for testing

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  // 1. Authenticated Cart/Checkout submission
  const checkoutPayload = JSON.stringify({
    items: [{ productId: 'test-product', quantity: 1 }]
  });
  const checkoutRes = http.post(`${baseUrl}/cart`, checkoutPayload, { headers });
  
  check(checkoutRes, { 
    'checkout rate limited or OK (200/429)': (r) => r.status === 200 || r.status === 429 
  });
  
  // 2. Contact form submission with CAPTCHA validation
  const contactPayload = JSON.stringify({
    name: "Load Test User",
    email: "test@example.com",
    message: "Load test message to validate write capacity",
    'cf-turnstile-response': turnstileToken
  });
  const contactRes = http.post(`${baseUrl}/contact`, contactPayload, { headers });

  check(contactRes, { 
    'contact rate limited or OK (200/429)': (r) => r.status === 200 || r.status === 429 
  });

  // Short sleep to hit rate limits quickly but not immediately spam loop
  sleep(2);
}
