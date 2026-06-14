// utils/csvLoader.js
// Utility to fetch and parse CSV files from public folder

export async function fetchAndParseCSV(csvPath) {
  const response = await fetch(csvPath);
  if (!response.ok) throw new Error('Failed to fetch CSV: ' + csvPath);
  const text = await response.text();
  return parseCSV(text);
}

// Load mixed puzzles from all available CSV files
export async function fetchMixedPuzzles() {
  const allPuzzles = [];
  const csvFiles = ['/puzzles/checkmate34.csv', '/puzzles/endgame.csv'];

  for (const file of csvFiles) {
    try {
      const puzzles = await fetchAndParseCSV(file);
      allPuzzles.push(...puzzles);
    } catch (error) {
    }
  }

  return allPuzzles;
}

// Naive CSV parser: expects header row, comma-separated, no quoted fields
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ''; });
    return obj;
  });
}
