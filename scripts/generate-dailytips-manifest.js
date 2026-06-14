/**
 * generate-dailytips-manifest.js
 * Run this script whenever you add new images to public/dailytips/
 *
 * Usage:  node frontend/scripts/generate-dailytips-manifest.js
 *   (run from the project root, or adjust paths below)
 */

const fs   = require('fs');
const path = require('path');

const DAILYTIPS_DIR  = path.join(__dirname, '..', 'public', 'dailytips');
const MANIFEST_FILE  = path.join(DAILYTIPS_DIR, 'manifest.json');

// Read all PNG files, sort numerically (1.png, 2.png, … 100.png …)
const images = fs.readdirSync(DAILYTIPS_DIR)
  .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f) && f !== 'manifest.json')
  .sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(images, null, 2));
console.log(`✅ manifest.json updated — ${images.length} images listed:`);
images.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
