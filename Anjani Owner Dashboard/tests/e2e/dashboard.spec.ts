import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard E2E', () => {
  test('Login and navigate tabs', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Login Modal is visible
    const loginOverlay = page.locator('#login-overlay');
    await expect(loginOverlay).toBeVisible();

    // 2. Perform Login (assuming mock auth or test credentials)
    // For now we'll just test the UI elements are present
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const loginBtn = page.locator('#login-btn');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginBtn).toBeVisible();

    // Note: To fully test login, we'd need to mock Firebase Auth 
    // or use test credentials against an emulator.
    // Assuming login works, we'd check the tabs:
    
    // 3. Check Tabs exist
    const operationsTab = page.locator('button[data-tab="operations"]');
    const menuTab = page.locator('button[data-tab="menu"]');
    const historicalTab = page.locator('button[data-tab="historical"]');
    const analyticsTab = page.locator('button[data-tab="analytics"]');

    await expect(operationsTab).toHaveText(/Operations Board/);
    await expect(menuTab).toHaveText(/Menu Catalog/);
    await expect(historicalTab).toHaveText(/Historical Data/);
    await expect(analyticsTab).toHaveText(/Analytics/);
  });
});
