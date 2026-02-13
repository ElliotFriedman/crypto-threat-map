#!/usr/bin/env node
/**
 * Step 1: Fetch Lopp's physical-bitcoin-attacks README and parse the markdown table.
 * Output: data/generated/incidents-raw.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseMarkdownTable } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'incidents-raw.json');

const LOPP_URL = 'https://raw.githubusercontent.com/jlopp/physical-bitcoin-attacks/master/README.md';

async function main() {
  console.log('Fetching Lopp README...');
  const response = await fetch(LOPP_URL);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const markdown = await response.text();
  console.log(`Fetched ${markdown.length} bytes`);

  console.log('Parsing markdown table...');
  const incidents = parseMarkdownTable(markdown);
  console.log(`Parsed ${incidents.length} incidents`);

  // Print date range
  const years = incidents.map(i => i.year).filter(y => y > 1970);
  console.log(`Date range: ${Math.min(...years)} - ${Math.max(...years)}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(incidents, null, 2));
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
