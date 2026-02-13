#!/usr/bin/env node
/**
 * Step 3: Classify severity (1-5) and tag attack types for each incident.
 * Uses keyword-based heuristics.
 * Input: data/generated/incidents-geocoded.json
 * Output: data/generated/incidents-classified.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, '..', 'generated', 'incidents-geocoded.json');
const OUTPUT_FILE = join(__dirname, '..', 'generated', 'incidents-classified.json');

const SEVERITY_RULES = [
  {
    level: 5,
    label: 'Fatal',
    patterns: [
      /\bkilled\b/i, /\bmurdered\b/i, /\bshot dead\b/i, /\bstrangled\b/i,
      /\bfound dead\b/i, /\bdeath\b/i, /\bdied\b/i, /\bburned to death\b/i,
      /\bkilled the victim\b/i, /\bbeat(?:en)? to death\b/i,
    ],
  },
  {
    level: 4,
    label: 'Critical',
    patterns: [
      /\bkidnap/i, /\babduct/i, /\btortur/i, /\bdrill\b/i,
      /\bfinger\b/i, /\belectrocut/i, /\bhostage/i, /\bdismember/i,
      /\btaser\b/i, /\bgasoline\b/i, /\bset.*fire\b/i, /\bpliers\b/i,
      /\bheld captive\b/i, /\bransom/i, /\bsequester/i,
      /\btied up\b/i, /\bbound\b/i, /\bchained\b/i,
    ],
  },
  {
    level: 3,
    label: 'Severe',
    patterns: [
      /\bgunpoint\b/i, /\bknifepoint\b/i, /\bmachete\b/i,
      /\barmed\b/i, /\b(?:fire|fired)\s*(?:a\s)?gun\b/i, /\bshot\b/i,
      /\bweapon/i, /\bhome invasion\b/i, /\binvad(?:e|ed)\b.*home/i,
      /\bbroke into\b/i, /\bstabbed\b/i, /\bbeat(?:en)?\b/i,
      /\bassault/i, /\bpistol/i, /\bshotgun/i, /\brifle/i,
    ],
  },
  {
    level: 2,
    label: 'Moderate',
    patterns: [
      /\brobbed\b/i, /\brobbery\b/i, /\bdrugged\b/i, /\bmugged\b/i,
      /\bextort/i, /\bscopolamine/i, /\bthreat/i, /\bstole\b/i,
      /\bscam/i, /\bfraud/i, /\bspiked\b/i, /\blured\b/i,
    ],
  },
  {
    level: 1,
    label: 'Minor',
    patterns: [
      /\bATM\b/i, /\bBTM\b/i, /\bbitcoin machine\b/i,
      /\bSWAT/i, /\bswatted\b/i,
    ],
  },
];

const ATTACK_TYPE_RULES = [
  { tag: 'home_invasion', patterns: [/home invasion/i, /invaded? home/i, /broke into.*(home|house|residence|apartment|condo)/i, /invade.*(home|house)/i] },
  { tag: 'kidnapping', patterns: [/kidnap/i, /abduct/i, /held hostage/i, /taken hostage/i, /held captive/i, /sequester/i] },
  { tag: 'armed_robbery', patterns: [/gunpoint/i, /knifepoint/i, /armed/i, /gun\b/i, /knife\b/i, /machete/i, /weapon/i, /pistol/i, /shotgun/i] },
  { tag: 'torture', patterns: [/tortur/i, /drill\b/i, /electrocuted/i, /finger.*sever/i, /dismember/i, /taser/i, /gasoline/i, /pliers/i, /beat(?:en)?.*severely/i] },
  { tag: 'murder', patterns: [/killed/i, /murdered/i, /shot dead/i, /strangled/i, /found dead/i, /death/i, /burned to death/i] },
  { tag: 'atm_theft', patterns: [/ATM/i, /BTM/i, /bitcoin machine/i, /bitcoin ATM/i, /crypto ATM/i] },
  { tag: 'otc_trade', patterns: [/bitcoin trade/i, /crypto trade/i, /in-person trade/i, /OTC/i, /LocalBitcoins/i, /face-to-face/i, /buy bitcoin/i, /sell bitcoin/i, /trader/i] },
  { tag: 'drugging', patterns: [/drugged/i, /scopolamine/i, /spiked/i] },
  { tag: 'extortion', patterns: [/extort/i, /ransom/i, /SWATted/i, /swat\b/i, /blackmail/i] },
  { tag: 'police_impersonation', patterns: [/posing as (police|cops)/i, /fake (police|cops)/i, /impersonat/i] },
  { tag: 'mining_theft', patterns: [/mining/i, /ASIC/i, /GPU/i, /mining farm/i, /mining facility/i] },
];

function classifySeverity(description) {
  for (const rule of SEVERITY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(description)) {
        return { severity: rule.level, severity_label: rule.label };
      }
    }
  }
  return { severity: 2, severity_label: 'Moderate' };
}

function tagAttackTypes(description) {
  const tags = [];
  for (const rule of ATTACK_TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(description)) {
        tags.push(rule.tag);
        break;
      }
    }
  }
  return tags.length > 0 ? tags : ['robbery'];
}

function main() {
  const incidents = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));

  const result = incidents.map(incident => {
    const desc = incident.description;
    const { severity, severity_label } = classifySeverity(desc);
    const attack_types = tagAttackTypes(desc);

    return { ...incident, severity, severity_label, attack_types };
  });

  // Print severity distribution
  const dist = {};
  for (const i of result) {
    dist[i.severity_label] = (dist[i.severity_label] || 0) + 1;
  }
  console.log('Severity distribution:', dist);

  // Print attack type distribution
  const typeDist = {};
  for (const i of result) {
    for (const t of i.attack_types) {
      typeDist[t] = (typeDist[t] || 0) + 1;
    }
  }
  console.log('Attack type distribution:', typeDist);

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Wrote ${OUTPUT_FILE} (${result.length} incidents)`);
}

main();
