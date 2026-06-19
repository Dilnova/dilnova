import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 50 },   // Scale to 50 virtual users
    { duration: '30s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete below 1.5 seconds
  },
};

export default function runLoadTest() {
  // Target URL defaults to localhost:3000 but can be overridden via environment variables
  const baseUrl = __ENV.TARGET_URL || 'http://localhost:3000';

  // 1. Benchmarking Catalog / Landing Page (Read Path)
  const catalogRes = http.get(`${baseUrl}/`);
  check(catalogRes, {
    'catalog status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Benchmarking Product Search / Listing Page
  const productsRes = http.get(`${baseUrl}/products`);
  check(productsRes, {
    'products page status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 3. Benchmarking Contact Page
  const contactRes = http.get(`${baseUrl}/contact`);
  check(contactRes, {
    'contact page status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 4. Benchmarking Cart Page
  const cartRes = http.get(`${baseUrl}/cart`);
  check(cartRes, {
    'cart page status is 200': (r) => r.status === 200,
  });
  sleep(1);
}

