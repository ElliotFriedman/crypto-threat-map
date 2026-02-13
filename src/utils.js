/**
 * Color scales, formatters, and shared constants.
 */

// Risk tier colors
export const TIER_COLORS = {
  0: '#d4d4d4',  // No data - light gray
  1: '#4dabf7',  // Low risk - blue
  2: '#ffd43b',  // Moderate - yellow
  3: '#ff922b',  // High - orange
  4: '#e03131',  // Very High - red
  5: '#862e2e',  // Conflict zone - dark maroon
};

export const TIER_LABELS = {
  0: 'No Data',
  1: 'Low Risk',
  2: 'Moderate Risk',
  3: 'High Risk',
  4: 'Very High Risk',
  5: 'Conflict Zone',
};

// Severity colors for incident markers
export const SEVERITY_COLORS = {
  1: '#22c55e',  // Minor - green
  2: '#eab308',  // Moderate - yellow
  3: '#f97316',  // Severe - orange
  4: '#dc2626',  // Critical - red
  5: '#7f1d1d',  // Fatal - dark red
};

export const SEVERITY_LABELS = {
  1: 'Minor',
  2: 'Moderate',
  3: 'Severe',
  4: 'Critical',
  5: 'Fatal',
};

// ISO alpha-2 to ISO numeric (used in world-atlas TopoJSON)
// This maps our country_code to the TopoJSON feature ID
export const ISO_A2_TO_NUMERIC = {
  AF: '004', AL: '008', DZ: '012', AD: '020', AO: '024', AG: '028', AR: '032',
  AM: '051', AU: '036', AT: '040', AZ: '031', BS: '044', BH: '048', BD: '050',
  BB: '052', BY: '112', BE: '056', BZ: '084', BJ: '204', BT: '064', BO: '068',
  BA: '070', BW: '072', BR: '076', BN: '096', BG: '100', BF: '854', BI: '108',
  KH: '116', CM: '120', CA: '124', CV: '132', CF: '140', TD: '148', CL: '152',
  CN: '156', CO: '170', KM: '174', CG: '178', CD: '180', CR: '188', CI: '384',
  HR: '191', CU: '192', CY: '196', CZ: '203', DK: '208', DJ: '262', DM: '212',
  DO: '214', EC: '218', EG: '818', SV: '222', GQ: '226', ER: '232', EE: '233',
  ET: '231', FJ: '242', FI: '246', FR: '250', GA: '266', GM: '270', GE: '268',
  DE: '276', GH: '288', GR: '300', GD: '308', GT: '320', GN: '324', GW: '624',
  GY: '328', HT: '332', HN: '340', HU: '348', IS: '352', IN: '356', ID: '360',
  IR: '364', IQ: '368', IE: '372', IL: '376', IT: '380', JM: '388', JP: '392',
  JO: '400', KZ: '398', KE: '404', KI: '296', KP: '408', KR: '410', KW: '414',
  KG: '417', LA: '418', LV: '428', LB: '422', LS: '426', LR: '430', LY: '434',
  LI: '438', LT: '440', LU: '442', MK: '807', MG: '450', MW: '454', MY: '458',
  MV: '462', ML: '466', MT: '470', MR: '478', MU: '480', MX: '484', MD: '498',
  MN: '496', ME: '499', MA: '504', MZ: '508', MM: '104', NA: '516', NP: '524',
  NL: '528', NZ: '554', NI: '558', NE: '562', NG: '566', NO: '578', OM: '512',
  PK: '586', PA: '591', PG: '598', PY: '600', PE: '604', PH: '608', PL: '616',
  PT: '620', QA: '634', RO: '642', RU: '643', RW: '646', SA: '682', SN: '686',
  RS: '688', SL: '694', SG: '702', SK: '703', SI: '705', SB: '090', SO: '706',
  ZA: '710', SS: '728', ES: '724', LK: '144', SD: '729', SR: '740', SZ: '748',
  SE: '752', CH: '756', SY: '760', TW: '158', TJ: '762', TZ: '834', TH: '764',
  TL: '626', TG: '768', TT: '780', TN: '788', TR: '792', TM: '795', UG: '800',
  UA: '804', AE: '784', GB: '826', US: '840', UY: '858', UZ: '860', VU: '548',
  VE: '862', VN: '704', YE: '887', ZM: '894', ZW: '716',
  HK: '344', PS: '275', XK: '780',
};

// FIPS code to state abbreviation (for us-atlas TopoJSON which uses FIPS)
export const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI',
};

export const STATE_TO_FIPS = Object.fromEntries(
  Object.entries(FIPS_TO_STATE).map(([k, v]) => [v, k])
);

/**
 * Format a date string for display.
 */
export function formatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Get a severity badge HTML string.
 */
export function severityBadge(level) {
  const color = SEVERITY_COLORS[level] || '#888';
  const label = SEVERITY_LABELS[level] || 'Unknown';
  return `<span class="severity-badge" style="background:${color}">${label}</span>`;
}

/**
 * Get a tier badge HTML string.
 */
export function tierBadge(tier) {
  const color = TIER_COLORS[tier] || '#888';
  const label = TIER_LABELS[tier] || 'Unknown';
  return `<span class="tier-badge" style="background:${color}">${label}</span>`;
}
