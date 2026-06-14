import { test, expect } from '@playwright/test';

// quick smoke test for teacher attendance page navigation

test.describe('Admin teacher attendance UI', () => {
  test('back button is present and returns to dashboard', async ({ page }) => {
    // login as admin
    await page.goto('http://localhost:5174/');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/**');

    // navigate to teacher attendance
    await page.goto('http://localhost:5174/admin/attendance');
    await page.waitForSelector('text="Teacher Attendance"');

    // back link should be visible
    const backLink = page.locator('a', { hasText: 'Back to Admin Dashboard' });
    await expect(backLink).toBeVisible();

    // clicking it should return to admin dashboard
    await backLink.click();
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/\/admin(\/)?$/);
  });
  test('event submissions button navigates correctly', async ({ page }) => {
    await page.goto('http://localhost:5174/admin/attendance');
    await page.waitForSelector('text="Teacher Attendance"');

    const eventBtn = page.locator('button', { hasText: 'Event Submissions' });
    await expect(eventBtn).toBeVisible();
    await eventBtn.click();
    await page.waitForURL('**/admin/event-submissions');
    await expect(page).toHaveURL(/\/admin\/event-submissions/);
  });});
