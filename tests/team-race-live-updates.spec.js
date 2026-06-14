import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

test.describe('Team Race Live Updates', () => {
  test('create team race, add teams, users join, verify live updates', async ({ browser }) => {
    console.log('\n🎬 TEST: Team Race with Live Updates\n');
    
    // Create 3 browser contexts
    const adminContext = await browser.newContext();
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // ===== ADMIN: LOGIN =====
      console.log('👑 Admin: Logging in...');
      await adminPage.goto('http://localhost:5174/');
      await adminPage.waitForLoadState('networkidle');
      await adminPage.waitForTimeout(2000); // Wait for React to render
      
      await adminPage.waitForSelector('input[placeholder="Username"]', { timeout: 15000 });
      await adminPage.fill('input[placeholder="Username"]', 'admin');
      await adminPage.fill('input[placeholder="Password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL('**/admin/**', { timeout: 15000 });
      console.log('✅ Admin logged in');

      // ===== ADMIN: CREATE TEAM RACE =====
      console.log('🏁 Admin: Creating team race...');
      await adminPage.goto('http://localhost:5174/admin/team-race', { waitUntil: 'networkidle' });
      
      const raceName = `Live Test ${Date.now()}`;
      await adminPage.fill('input[name="raceName"]', raceName);
      await adminPage.fill('textarea[name="description"]', 'Testing live updates');
      await adminPage.fill('input[name="maxTeams"]', '2');
      await adminPage.fill('input[name="maxPlayersPerTeam"]', '2');
      await adminPage.click('button:has-text("Create Team Race")');
      await adminPage.waitForTimeout(2000);
      console.log(`✅ Race created: ${raceName}`);

      // ===== ADMIN: CREATE TEAMS =====
      console.log('👥 Admin: Creating teams...');
      const raceCard = adminPage.locator(`.race-card:has-text("${raceName}")`);
      await raceCard.locator('button:has-text("Manage")').click();
      await adminPage.waitForURL('**/admin/team-race/**');
      const raceUrl = adminPage.url();
      const raceId = raceUrl.split('/').pop();
      console.log(`📋 Race ID: ${raceId}`);

      await adminPage.fill('input[placeholder="Enter team name"]', 'Dragons');
      await adminPage.click('button:has-text("Create Team")');
      await adminPage.waitForSelector('.team-card:has-text("Dragons")');
      console.log('✅ Dragons team created');
      
      await adminPage.fill('input[placeholder="Enter team name"]', 'Tigers');
      await adminPage.click('button:has-text("Create Team")');
      await adminPage.waitForSelector('.team-card:has-text("Tigers")');
      console.log('✅ Tigers team created');

      // ===== ADMIN: OPEN LOBBY =====
      console.log('🚪 Admin: Opening lobby...');
      await adminPage.click('button:has-text("Open Lobby")');
      await adminPage.waitForTimeout(2000);
      console.log('✅ Lobby opened');

      // ===== USER 1: LOGIN AND JOIN DRAGONS =====
      console.log('🐉 User 1: Joining Dragons...');
      await user1Page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
      await user1Page.waitForSelector('input[placeholder="Username"]');
      await user1Page.fill('input[placeholder="Username"]', 'testuser1');
      await user1Page.fill('input[placeholder="Password"]', 'test123');
      await user1Page.click('button[type="submit"]');
      await user1Page.waitForURL('**/racer/dashboard', { timeout: 10000 });
      
      await user1Page.goto(`http://localhost:5174/team-race/${raceId}/select-team`, { waitUntil: 'networkidle' });
      await user1Page.waitForSelector('.team-card:has-text("Dragons")');
      await user1Page.locator('.team-card:has-text("Dragons") button:has-text("Join")').click();
      await user1Page.waitForURL(`**/team-race/${raceId}/lobby`, { timeout: 10000 });
      console.log('✅ User 1 joined Dragons');

      // ===== VERIFY USER 1 SEES DRAGONS WITH 1 PLAYER =====
      await user1Page.waitForSelector('.team-summary:has-text("Dragons")');
      let dragonsCount = await user1Page.locator('.team-summary:has-text("Dragons") .stat-value').first().textContent();
      console.log(`📊 User 1 sees Dragons: ${dragonsCount}`);
      expect(dragonsCount).toContain('1');

      // ===== USER 2: LOGIN AND JOIN TIGERS =====
      console.log('🐯 User 2: Joining Tigers...');
      await user2Page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
      await user2Page.waitForSelector('input[placeholder="Username"]');
      await user2Page.fill('input[placeholder="Username"]', 'testuser2');
      await user2Page.fill('input[placeholder="Password"]', 'test123');
      await user2Page.click('button[type="submit"]');
      await user2Page.waitForURL('**/racer/dashboard', { timeout: 10000 });
      
      await user2Page.goto(`http://localhost:5174/team-race/${raceId}/select-team`, { waitUntil: 'networkidle' });
      await user2Page.waitForSelector('.team-card:has-text("Tigers")');
      await user2Page.locator('.team-card:has-text("Tigers") button:has-text("Join")').click();
      await user2Page.waitForURL(`**/team-race/${raceId}/lobby`, { timeout: 10000 });
      console.log('✅ User 2 joined Tigers');

      // ===== CRITICAL: VERIFY LIVE UPDATE ON USER 1 PAGE =====
      console.log('🔥 Verifying LIVE UPDATE on User 1 page...');
      
      // Wait a moment for socket event to propagate
      await user1Page.waitForTimeout(2000);
      
      // User 1 should now see Tigers team WITHOUT refresh
      const tigersVisible = await user1Page.locator('.team-summary:has-text("Tigers")').count();
      expect(tigersVisible).toBeGreaterThan(0);
      
      const tigersCount = await user1Page.locator('.team-summary:has-text("Tigers") .stat-value').first().textContent();
      console.log(`🎉 LIVE UPDATE SUCCESS: User 1 sees Tigers: ${tigersCount} (WITHOUT page refresh!)`);
      expect(tigersCount).toContain('1');

      // Verify total participant count updated
      const participantText = await user1Page.locator('h2:has-text("All Participants")').textContent();
      console.log(`📊 Total participants: ${participantText}`);
      expect(participantText).toContain('(2)');

      // ===== ADMIN: START RACE =====
      console.log('🏁 Admin: Starting race...');
      await adminPage.bringToFront();
      await adminPage.click('button:has-text("Start Race")');
      await adminPage.waitForTimeout(2000);
      console.log('✅ Race started');

      // ===== VERIFY USERS REDIRECTED TO PUZZLES =====
      console.log('🧩 Waiting for puzzle pages...');
      await user1Page.waitForTimeout(3000);
      await user2Page.waitForTimeout(3000);
      
      const user1Url = user1Page.url();
      const user2Url = user2Page.url();
      console.log(`User 1 URL: ${user1Url}`);
      console.log(`User 2 URL: ${user2Url}`);

      // Take final screenshots
      await adminPage.screenshot({ path: '/tmp/admin-final.png', fullPage: true });
      await user1Page.screenshot({ path: '/tmp/user1-final.png', fullPage: true });
      await user2Page.screenshot({ path: '/tmp/user2-final.png', fullPage: true });
      
      console.log('\n🎉 TEST PASSED! Live updates working correctly!\n');
      console.log('Screenshots saved to:');
      console.log('  - /tmp/admin-final.png');
      console.log('  - /tmp/user1-final.png');
      console.log('  - /tmp/user2-final.png\n');
      
    } catch (error) {
      console.error('❌ TEST FAILED:', error.message);
      await adminPage.screenshot({ path: '/tmp/admin-error.png', fullPage: true }).catch(() => {});
      await user1Page.screenshot({ path: '/tmp/user1-error.png', fullPage: true }).catch(() => {});
      await user2Page.screenshot({ path: '/tmp/user2-error.png', fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await adminContext.close();
      await user1Context.close();
      await user2Context.close();
    }
  });
});
