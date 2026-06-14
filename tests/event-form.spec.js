import { test, expect } from '@playwright/test';

// verify that clicking an event on the homepage brings up the modal form

test.describe('Event submission flow', () => {
  test('clicking event navigates to detail page and then to register page', async ({ page }) => {
    await page.goto('http://localhost:5174/');

    // make sure there are at least two events and the container handles overflow correctly
    const eventsList = page.locator('.events-list');
    const eventItems = page.locator('.event-item');
    await expect(eventItems.first()).toBeVisible();
    if ((await eventItems.count()) >= 2) {
      const secondEvent = eventItems.nth(1);
      // second event should not be clipped by adjacent cards
      await expect(secondEvent).toBeVisible();
    }

    // verify container expands: height should accommodate all event items
    const cardHeight = await page.evaluate(() => {
      const el = document.querySelector('.events-card');
      return el ? el.clientHeight : 0;
    });
    const itemCount = await eventItems.count();
    // expect at least 60px per item roughly (padding/content)
    expect(cardHeight).toBeGreaterThan(itemCount * 50);

    const firstEvent = page.locator('.event-item').first();
    // ensure event cards remain reasonably short
    const heights = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.event-item')).map(el => el.clientHeight);
    });
    heights.forEach(h => expect(h).toBeLessThan(90));
    await firstEvent.click();

    // should be on event detail page (id component present)
    await page.waitForURL('**/event/*');
    await expect(page.locator('h1')).toHaveText(/February Monthly Focus Week Challenge/);

    // click join button
    await page.click('button:has-text("Join Event")');
    await page.waitForURL('**/event/*/register');
    // form should be visible
    await expect(page.locator('form')).toBeVisible();

    // fill out a couple of fields and submit
    await page.fill('#name', 'Test User');
    await page.fill('#age', '30');
    await page.fill('#country', 'Land');
    await page.fill('#timeZone', 'UTC');
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Submit")');

    // success screen should include event name
    await page.waitForSelector('.event-success');
    await expect(page.locator('.event-success p')).toContainText('registered for');
  });
});