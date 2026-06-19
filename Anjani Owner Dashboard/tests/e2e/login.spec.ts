import { test, expect } from '@playwright/test';

test('has title and login button', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Anjani/i);

  // Expect the login container to be visible initially
  const loginSection = page.locator('#login-section');
  await expect(loginSection).toBeVisible();

  // Or click the login button to simulate standard flow
  // const loginBtn = page.locator('#login-btn');
  // await loginBtn.click();
});
