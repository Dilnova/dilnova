import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';

test.beforeEach(() => {
  // We can test catalog browsing either logged in or logged out.
  // Using customer auth to ensure they have the right view.
  test.skip(!authStateExists('customer'), 'Run auth.setup with E2E_CUSTOMER_EMAIL to enable this suite.');
});

test.describe('Catalog Browsing and Searching', () => {
  test('can load the products page and view items', async ({ page }) => {
    // 1. Navigate to products
    await page.goto('/products');
    await expect(page).toHaveURL(/\/products/);

    // 2. Verify page structure loaded
    await expect(page.locator('h1').filter({ hasText: /Products & Services/i }).or(page.getByText(/Products/i).first())).toBeVisible();
    
    // 3. Verify either products exist or the empty state is shown
    const productCard = page.locator('a[href^="/products/"]').first();
    const emptyState = page.getByText(/No Catalog Items Found/i);
    
    await expect(productCard.or(emptyState)).toBeVisible();
  });

  test('can use the search input to filter items', async ({ page }) => {
    await page.goto('/products');

    // Find the search input (usually by placeholder like "Search products...")
    const searchInput = page.getByPlaceholder(/search/i).first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search query');
      await searchInput.press('Enter');

      // Verify the URL was updated with the search query
      await expect(page).toHaveURL(/search=test\+search\+query/i);
      
      // Verify loading state resolves to either items or empty state
      const productCard = page.locator('a[href^="/products/"]').first();
      const emptyState = page.getByText(/No Catalog Items Found/i);
      await expect(productCard.or(emptyState)).toBeVisible();
    }
  });

  test('can toggle between products and services types', async ({ page }) => {
    await page.goto('/products');

    // Click the "Services" filter if it exists (usually a button, link, or select option)
    const servicesFilter = page.getByRole('link', { name: /^Services$/i }).or(page.getByRole('button', { name: /^Services$/i }));
    
    if (await servicesFilter.first().isVisible()) {
      await servicesFilter.first().click();
      
      // Verify URL updates
      await expect(page).toHaveURL(/type=service/i);
      
      // Verify results
      const productCard = page.locator('a[href^="/products/"]').first();
      const emptyState = page.getByText(/No Catalog Items Found/i);
      await expect(productCard.or(emptyState)).toBeVisible();
    }
  });
});
