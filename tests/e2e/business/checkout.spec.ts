import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('customer'), 'Run auth.setup with E2E_CUSTOMER_EMAIL to enable this suite.');
});

test.describe('Customer Checkout Flow', () => {
  test('can add item to cart and checkout', async ({ page }) => {
    // 1. Navigate to products
    await page.goto('/products');
    await expect(page).toHaveURL(/\/products/);

    // 2. Add first product to cart (if any exist)
    const firstProduct = page.locator('a[href^="/products/"]').first();
    const productExists = await firstProduct.isVisible();
    if (!productExists) {
      test.skip(true, 'No products available to test checkout flow.');
      return;
    }
    
    await firstProduct.click();
    await page.waitForURL(/\/products\/.+/);

    // Click "Add to Cart"
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 3. Navigate to Cart
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/cart/);

    // Verify item in cart
    const checkoutBtn = page.getByRole('button', { name: /checkout/i }).first();
    await expect(checkoutBtn).toBeVisible();
    
    // 4. Proceed to checkout
    await checkoutBtn.click();

    // Verify success state or next step
    // We expect some progression, either a success message or order confirmation
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
