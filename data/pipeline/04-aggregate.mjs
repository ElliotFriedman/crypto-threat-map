#!/usr/bin/env node
/**
 * Step 4: Aggregate incidents by country and US state. Calculate risk tiers.
 * Input: data/generated/incidents-classified.json + data/sources/conflict-zones.json
 * Output: data/generated/incidents.json (final), country-risk.json, us-state-risk.json, meta.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, '..', 'generated', 'incidents-classified.json');
const CONFLICT_FILE = join(__dirname, '..', 'sources', 'conflict-zones.json');
const OUTPUT_DIR = join(__dirname, '..', 'generated');

const NOW = new Date();
const ONE_YEAR_AGO = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
const TWO_YEARS_AGO = new Date(NOW.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

function calculateRiskTier(incidents) {
  if (incidents.length === 0) return 1;

  const count = incidents.length;
  const avgSeverity = incidents.reduce((s, i) => s + i.severity, 0) / count;

  // Recency: weight recent incidents more heavily
  let recencyScore = 0;
  for (const inc of incidents) {
    const d = new Date(inc.date);
    if (d >= ONE_YEAR_AGO) recencyScore += 3;
    else if (d >= TWO_YEARS_AGO) recencyScore += 2;
    else recencyScore += 1;
  }
  recencyScore = recencyScore / count; // Average recency weight

  // Use sqrt instead of log2 to preserve sensitivity to high counts
  const countScore = Math.sqrt(count);
  const score =
    countScore * 0.4 +
    avgSeverity * 0.3 +
    recencyScore * 0.3;

  // Thresholds calibrated against actual data:
  // US=4.19, FR=4.20 → tier 4
  // UK=3.05, TH=3.10, CA=3.10 → tier 3
  // IN=2.86, HK=2.66, NL=2.04 → tier 2
  // 1-2 low-severity incidents → tier 1
  if (score < 2.0) return 1;
  if (score < 3.0) return 2;
  if (score < 4.0) return 3;
  return 4;
}

function aggregateGroup(incidents) {
  const count = incidents.length;
  if (count === 0) return null;

  const severityDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const typeDist = {};
  const yearDist = {};

  for (const inc of incidents) {
    severityDist[inc.severity]++;
    for (const t of inc.attack_types) {
      typeDist[t] = (typeDist[t] || 0) + 1;
    }
    yearDist[inc.year] = (yearDist[inc.year] || 0) + 1;
  }

  const avgSeverity = incidents.reduce((s, i) => s + i.severity, 0) / count;
  const maxSeverity = Math.max(...incidents.map(i => i.severity));
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));

  return {
    incident_count: count,
    severity_distribution: severityDist,
    avg_severity: Math.round(avgSeverity * 100) / 100,
    max_severity: maxSeverity,
    risk_tier: calculateRiskTier(incidents),
    incidents_by_year: yearDist,
    most_recent: sorted[0]?.date || null,
    top_types: Object.entries(typeDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
  };
}

function main() {
  const incidents = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  const conflictData = JSON.parse(readFileSync(CONFLICT_FILE, 'utf8'));

  // Build conflict zone set
  const conflictSet = new Set(conflictData.countries.map(c => c.code));
  const conflictMap = {};
  for (const c of conflictData.countries) {
    conflictMap[c.code] = c;
  }

  // Filter incidents with valid country codes
  const validIncidents = incidents.filter(i => i.country_code);

  // Aggregate by country
  const byCountry = {};
  for (const inc of validIncidents) {
    const cc = inc.country_code;
    if (!byCountry[cc]) byCountry[cc] = [];
    byCountry[cc].push(inc);
  }

  const countryRisk = {};
  for (const [cc, incs] of Object.entries(byCountry)) {
    const agg = aggregateGroup(incs);
    countryRisk[cc] = {
      country_code: cc,
      country_name: incs[0].country_name,
      ...agg,
      is_conflict_zone: conflictSet.has(cc),
    };
    // Conflict zones override to tier 5
    if (conflictSet.has(cc)) {
      countryRisk[cc].risk_tier = 5;
      countryRisk[cc].conflict_reason = conflictMap[cc]?.reason || 'Conflict zone';
    }
  }

  // Add conflict zone countries with zero incidents
  for (const c of conflictData.countries) {
    if (!countryRisk[c.code]) {
      countryRisk[c.code] = {
        country_code: c.code,
        country_name: c.name,
        incident_count: 0,
        severity_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avg_severity: 0,
        max_severity: 0,
        risk_tier: 5,
        incidents_by_year: {},
        most_recent: null,
        top_types: [],
        is_conflict_zone: true,
        conflict_reason: c.reason,
      };
    }
  }

  // Aggregate by US state
  const usIncidents = validIncidents.filter(i => i.country_code === 'US' && i.state);
  const byState = {};
  for (const inc of usIncidents) {
    const st = inc.state;
    if (!byState[st]) byState[st] = [];
    byState[st].push(inc);
  }

  const stateRisk = {};
  for (const [st, incs] of Object.entries(byState)) {
    stateRisk[st] = {
      state_code: st,
      state_name: getStateName(st),
      ...aggregateGroup(incs),
    };
  }

  // Generate final incidents.json with IDs
  const finalIncidents = incidents.map((inc, idx) => ({
    id: idx,
    ...inc,
  }));

  // Meta
  const meta = {
    generated_at: NOW.toISOString(),
    source_url: 'https://github.com/jlopp/physical-bitcoin-attacks',
    total_incidents: incidents.length,
    geocoded_incidents: validIncidents.length,
    countries_affected: Object.keys(byCountry).length,
    us_states_affected: Object.keys(byState).length,
    conflict_zones: conflictData.countries.length,
    date_range: {
      earliest: incidents[0]?.date,
      latest: incidents[incidents.length - 1]?.date,
    },
  };

  writeFileSync(join(OUTPUT_DIR, 'incidents.json'), JSON.stringify(finalIncidents, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'country-risk.json'), JSON.stringify(countryRisk, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'us-state-risk.json'), JSON.stringify(stateRisk, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`Countries with incidents: ${Object.keys(byCountry).length}`);
  console.log(`US states with incidents: ${Object.keys(byState).length}`);
  console.log(`Conflict zones added: ${conflictData.countries.length}`);
  console.log(`Total country entries: ${Object.keys(countryRisk).length}`);

  // Print top 10 countries
  const sorted = Object.values(countryRisk)
    .filter(c => !c.is_conflict_zone || c.incident_count > 0)
    .sort((a, b) => b.incident_count - a.incident_count)
    .slice(0, 10);
  console.log('\nTop 10 countries by incident count:');
  for (const c of sorted) {
    console.log(`  ${c.country_name}: ${c.incident_count} incidents (tier ${c.risk_tier})`);
  }

  console.log('\nWrote all output files to', OUTPUT_DIR);
}

function getStateName(code) {
  const names = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
  };
  return names[code] || code;
}

main();
