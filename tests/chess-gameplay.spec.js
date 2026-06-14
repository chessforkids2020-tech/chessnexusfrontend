import { test, expect } from '@playwright/test';

test.describe('Chess Gameplay', () => {
  test('Full game from start to checkmate', async ({ browser }) => {
    // 1. Create two contexts
    const whiteContext = await browser.newContext();
    const blackContext = await browser.newContext();
    const whitePage = await whiteContext.newPage();
    const blackPage = await blackContext.newPage();

    // 2. Login both users
    const login = async (page, username, password) => {
      await page.goto('http://localhost:5173/login');
      await page.fill('input[placeholder="Username"]', username);
      await page.fill('input[placeholder="Password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    };

    console.log('Logging in testuser1...');
    await login(whitePage, 'testuser1', 'testuser123');
    console.log('Logging in testuser2...');
    await login(blackPage, 'testuser2', 'testuser223');

    // 3. Go to Play page and find game
    const findGame = async (page) => {
      await page.goto('http://localhost:5173/play');
      // Click '10+0' in Rapid category
      await page.click('text=10+0');
    };

    console.log('Finding game for both users...');
    await findGame(whitePage);
    await findGame(blackPage);

    // 4. Wait for game to start
    console.log('Waiting for game start...');
    await expect(whitePage).toHaveURL(/\/game\/live\/game_/, { timeout: 30000 });
    await expect(blackPage).toHaveURL(/\/game\/live\/game_/, { timeout: 30000 });
    
    const gameUrl = whitePage.url();
    console.log(`Game started! URL: ${gameUrl}`);

    // Identify who is white and who is black
    const whiteOrientation = await whitePage.evaluate(() => {
        // We'll wait a bit for the game data to load and set orientation
        return document.body.innerText.includes('You: testuser1') && 
               document.body.innerText.includes('Opponent: testuser2') ? 'white' : 'black';
    });
    
    let pWhite, pBlack;
    if (whiteOrientation === 'white') {
        pWhite = whitePage;
        pBlack = blackPage;
        console.log('testuser1 is WHITE, testuser2 is BLACK');
    } else {
        pWhite = blackPage;
        pBlack = whitePage;
        console.log('testuser2 is WHITE, testuser1 is BLACK');
    }

    // 5. Play Fool's Mate
    // White: g2g4
    // Black: e7e5
    // White: f2f3
    // Black: d8h4#

    const makeMove = async (page, from, to) => {
        console.log(`Making move: ${from} -> ${to}`);
        await page.click(`div[data-square="${from}"]`);
        await page.click(`div[data-square="${to}"]`);
        await page.waitForTimeout(1000); // Wait for animation and sync
    };

    // Step 1: White g2g4
    await pWhite.waitForSelector('div[data-square="g2"]');
    await makeMove(pWhite, 'g2', 'g4');
    
    // Step 2: Black e7e5
    await pBlack.waitForSelector('div[data-square="e7"]');
    await makeMove(pBlack, 'e7', 'e5');
    
    // Step 3: White f2f3
    await pWhite.waitForSelector('div[data-square="f2"]');
    await makeMove(pWhite, 'f2', 'f3');
    
    // Step 4: Black d8h4 (Checkmate)
    await pBlack.waitForSelector('div[data-square="d8"]');
    await makeMove(pBlack, 'd8', 'h4');

    // 6. Verify Checkmate
    console.log('Verifying checkmate status...');
    await expect(pWhite.locator('text=Checkmate')).toBeVisible({ timeout: 10000 });
    await expect(pBlack.locator('text=Checkmate')).toBeVisible({ timeout: 10000 });

    // 7. Verify Rating Change displayed
    console.log('Verifying rating change...');
    // One should have positive change, other negative
    await expect(pBlack.locator('text=(+')).toBeVisible();
    await expect(pWhite.locator('text=(-')).toBeVisible();

    console.log('Test completed successfully!');
    
    await whiteContext.close();
    await blackContext.close();
  });
});
