const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 400 } });
  const css = fs.readFileSync('src/pages/PuzzlesHub.css','utf8');
  const card = (cls, icon, tag, title, desc) => `
    <div class="hub-mini-card ${cls}">
      <div class="hub-mini-icon">${icon}</div>
      <div class="hub-mini-body">
        <span class="hub-mini-tag">${tag}</span>
        <h3 class="hub-mini-title">${title}</h3>
        <p class="hub-mini-desc">${desc}</p>
      </div><span class="hub-mini-arrow">&rarr;</span>
    </div>`;
  await p.setContent(`<html><head><style>
    body{background:#0d1117;margin:0;padding:24px;font-family:system-ui,sans-serif}
    ${css}
  </style></head><body>
    <div class="hub-bottom-row">
      ${card('hub-mini--blunder hub-mini--wide','&#128270;','Analysis','Find the Blunder','Spot the losing move in a real game')}
      ${card('hub-mini--ttt','&#9876;&#65039;','Strategy','TTT','Puzzle-powered Tic-Tac-Toe')}
      ${card('hub-mini--bingo','&#127920;','Knowledge','Bingo','Spot tactical themes')}
    </div>
  </body></html>`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: '_r.png' });
  await b.close();
})();
