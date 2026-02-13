#!/usr/bin/env node
/**
 * Step 2: Apply static geocode lookup to incidents.
 * Input: data/generated/incidents-raw.json + data/sources/location-geocodes.json
 * Output: data/generated/incidents-geocoded.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INCIDENTS_FILE = join(__dirname, '..', 'generated', 'incidents-raw.json');
const GEOCODES_FILE = join(__dirname, '..', 'sources', 'location-geocodes.json');
const OUTPUT_FILE = join(__dirname, '..', 'generated', 'incidents-geocoded.json');

function main() {
  const incidents = JSON.parse(readFileSync(INCIDENTS_FILE, 'utf8'));
  const geocodes = JSON.parse(readFileSync(GEOCODES_FILE, 'utf8'));

  let resolved = 0;
  let unresolved = 0;

  const result = incidents.map((incident, idx) => {
    const loc = incident.location_raw;
    const geo = geocodes[loc];

    if (geo) {
      resolved++;
      return {
        ...incident,
        lat: geo.lat,
        lng: geo.lng,
        country_code: geo.country_code,
        country_name: geo.country_name,
        state: geo.state || null,
      };
    } else {
      unresolved++;
      console.warn(`UNRESOLVED [${idx}]: "${loc}"`);
      return {
        ...incident,
        lat: null,
        lng: null,
        country_code: null,
        country_name: null,
        state: null,
      };
    }
  });

  console.log(`Geocoded: ${resolved}/${incidents.length} (${unresolved} unresolved)`);

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main();
