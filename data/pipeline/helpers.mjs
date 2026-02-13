/**
 * Shared utilities for the data pipeline.
 */

/**
 * Parse a date string from the Lopp database into { iso, precision }.
 * Handles: "December 29, 2014", "?, 2018", "February, 2015", "November ?, 2018",
 *          "Early January, 2023", "November 4 & 8, 2024"
 */
export function parseDate(raw) {
  const s = raw.trim();

  // "?, 2018" — year only
  if (/^\?,?\s*\d{4}$/.test(s)) {
    const year = s.match(/(\d{4})/)[1];
    return { iso: `${year}-01-01`, precision: 'year', year: parseInt(year) };
  }

  // "November ?, 2018" — month + year, unknown day
  const monthUnknownDay = s.match(/^([A-Za-z]+)\s*\??,?\s*(\d{4})$/);
  if (monthUnknownDay) {
    const month = monthToNum(monthUnknownDay[1]);
    const year = monthUnknownDay[2];
    if (month) return { iso: `${year}-${month}-01`, precision: 'month', year: parseInt(year) };
  }

  // "February, 2015" — month + year
  const monthYear = s.match(/^([A-Za-z]+),?\s*(\d{4})$/);
  if (monthYear) {
    const month = monthToNum(monthYear[1]);
    const year = monthYear[2];
    if (month) return { iso: `${year}-${month}-01`, precision: 'month', year: parseInt(year) };
  }

  // "Early January, 2023" — prefixed month + year
  const prefixedMonthYear = s.match(/^(?:Early|Late|Mid|mid-?)\s*([A-Za-z]+),?\s*(\d{4})$/i);
  if (prefixedMonthYear) {
    const month = monthToNum(prefixedMonthYear[1]);
    const year = prefixedMonthYear[2];
    if (month) return { iso: `${year}-${month}-01`, precision: 'month', year: parseInt(year) };
  }

  // "November 4 & 8, 2024" — compound, take first date
  const compound = s.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[&,]\s*\d{1,2},?\s*(\d{4})$/);
  if (compound) {
    const month = monthToNum(compound[1]);
    const day = compound[2].padStart(2, '0');
    const year = compound[3];
    if (month) return { iso: `${year}-${month}-${day}`, precision: 'day', year: parseInt(year) };
  }

  // Standard: "December 29, 2014"
  const standard = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (standard) {
    const month = monthToNum(standard[1]);
    const day = standard[2].padStart(2, '0');
    const year = standard[3];
    if (month) return { iso: `${year}-${month}-${day}`, precision: 'day', year: parseInt(year) };
  }

  // Fallback: try native Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { iso: `${year}-${month}-${day}`, precision: 'day', year };
  }

  // Last resort — extract year if present
  const yearMatch = s.match(/(\d{4})/);
  if (yearMatch) {
    return { iso: `${yearMatch[1]}-01-01`, precision: 'year', year: parseInt(yearMatch[1]) };
  }

  return { iso: '1970-01-01', precision: 'unknown', year: 1970 };
}

function monthToNum(name) {
  const months = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };
  return months[name.toLowerCase()] || null;
}

/**
 * Extract markdown links from description text.
 * Returns { text, urls } where text is the plain description and urls is an array of source URLs.
 */
export function parseDescription(raw) {
  const urls = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let text = raw;

  while ((match = linkRegex.exec(raw)) !== null) {
    urls.push(match[2]);
  }

  // Remove markdown link syntax, keep link text
  text = text.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Remove "(original link)" markers
  text = text.replace(/\s*\(original link\)\s*/g, '');
  // Remove "(en)" markers
  text = text.replace(/\s*\(en\)\s*/g, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return { text, urls };
}

/**
 * Parse the markdown table from the Lopp README into an array of incident objects.
 */
export function parseMarkdownTable(markdown) {
  const lines = markdown.split('\n');
  const incidents = [];

  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect table start
    if (trimmed.startsWith('| Date')) {
      inTable = true;
      continue;
    }

    // Skip separator row
    if (inTable && /^\|[\s:-]+\|/.test(trimmed)) {
      headerPassed = true;
      continue;
    }

    // Parse data rows
    if (inTable && headerPassed && trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length >= 4) {
        const dateRaw = cells[0];
        const victim = cells[1];
        const location = cells[2];
        const descriptionRaw = cells[3];

        const { iso, precision, year } = parseDate(dateRaw);
        const { text: description, urls: sourceUrls } = parseDescription(descriptionRaw);

        incidents.push({
          date_raw: dateRaw,
          date: iso,
          date_precision: precision,
          year,
          victim,
          location_raw: location,
          description,
          source_urls: sourceUrls,
        });
      }
    }

    // End of table (blank line or non-table content after table started)
    if (inTable && headerPassed && !trimmed.startsWith('|') && trimmed.length > 0) {
      break;
    }
  }

  return incidents;
}
